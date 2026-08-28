import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer } from "node:http";
import { io as ioClient } from "socket.io-client";
import { setupSocket } from "../src/socket/index.js";
import * as roomStore from "../src/rooms/roomStore.js";
import { AVATAR_IDS } from "../src/domain/room.js";

let httpServer;
let io;
let port;
const clients = [];

function connectClient() {
  const socket = ioClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  return socket;
}

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeEach(async () => {
  httpServer = createServer();
  io = setupSocket(httpServer, "*");
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterEach(async () => {
  for (const c of roomStore.allCodes()) roomStore.remove(c);
  clients.forEach((c) => c.disconnect());
  clients.length = 0;
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe("integración de socket", () => {
  it("E2E-B01: room:create devuelve un código válido y el emisor queda como hostId", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code, room } = await waitFor(host, "room:created");

    expect(code).toMatch(/^RETRO-/);
    expect(room.hostId).toBe(host.id);
  });

  it("E2E-B02: un segundo cliente que hace room:join aparece para ambos en room:state", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const hostStatePromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana" });
    const [hostState, participantState] = await Promise.all([
      hostStatePromise,
      waitFor(participant, "room:state"),
    ]);

    expect(hostState.room.participants).toHaveLength(2);
    expect(participantState.room.participants).toHaveLength(2);
    expect(participantState.room.participants.map((p) => p.name)).toContain("Ana");
  });

  it("E2E-B02b: avatarId se guarda si es válido, y queda null si no se envía o es inválido", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", avatarId: AVATAR_IDS[0] });
    const { code, room: createdRoom } = await waitFor(host, "room:created");
    expect(createdRoom.participants[0].avatarId).toBe(AVATAR_IDS[0]);

    const participant = connectClient();
    const hostStatePromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana", avatarId: "mario" });
    const [, participantState] = await Promise.all([hostStatePromise, waitFor(participant, "room:state")]);

    const ana = participantState.room.participants.find((p) => p.name === "Ana");
    expect(ana.avatarId).toBeNull();
  });

  it("room:create guarda previousActionNotes como texto libre, visible para todos en room:state", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", previousActionNotes: "Documentar el proceso de deploy" });
    const { code, room: createdRoom } = await waitFor(host, "room:created");
    expect(createdRoom.previousActionNotes).toBe("Documentar el proceso de deploy");

    const participant = connectClient();
    const hostStatePromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana" });
    const [, participantState] = await Promise.all([hostStatePromise, waitFor(participant, "room:state")]);

    expect(participantState.room.previousActionNotes).toBe("Documentar el proceso de deploy");
  });

  it("room:create rechaza previousActionNotes que supera el máximo de caracteres", async () => {
    const host = connectClient();
    const errorPromise = waitFor(host, "error:invalid_action");
    host.emit("room:create", { hostName: "Cisco", previousActionNotes: "a".repeat(2001) });
    const error = await errorPromise;
    expect(error.action).toBe("room:create");
  });

  it("E2E-B03: un no-host que emite phase:advance recibe error:unauthorized sin cambiar el estado", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code, room: createdRoom } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    const errorPromise = waitFor(participant, "error:unauthorized");
    participant.emit("phase:advance");
    const error = await errorPromise;

    expect(error.action).toBe("phase:advance");
    expect(roomStore.get(code).phase).toBe(createdRoom.phase);
  });

  it("E2E-B04: el host emitiendo phase:advance produce room:state actualizado para todos", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const hostJoinBroadcastPromise = waitFor(host, "room:state"); // el join del participante también llega al host
    participant.emit("room:join", { code, name: "Ana" });
    await Promise.all([waitFor(participant, "room:state"), hostJoinBroadcastPromise]);

    const hostStatePromise = waitFor(host, "room:state");
    const participantStatePromise = waitFor(participant, "room:state");
    host.emit("phase:start_session");
    const [hostState, participantState] = await Promise.all([hostStatePromise, participantStatePromise]);

    expect(hostState.room.phase).toBe("welcome");
    expect(participantState.room.phase).toBe("welcome");
  });

  it("E2E-B05: durante un timer activo, todos los clientes reciben el mismo remainingSeconds en cada tick", async () => {
    const host = connectClient();
    host.emit("room:create", {
      hostName: "Cisco",
      phaseDurations: { welcome: 60 },
    });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    const hostTickPromise = waitFor(host, "timer:tick");
    const participantTickPromise = waitFor(participant, "timer:tick");
    host.emit("phase:start_session");
    const [hostTick, participantTick] = await Promise.all([hostTickPromise, participantTickPromise]);

    expect(hostTick.remainingSeconds).toBe(participantTick.remainingSeconds);
  }, 10000);

  it("E2E-B05b: al llegar el timer a 0 se emite room:state con timer.status='finished' (no solo timer:tick)", async () => {
    const host = connectClient();
    host.emit("room:create", {
      hostName: "Cisco",
      phaseDurations: { welcome: 60 }, // el mínimo permitido por el backend
    });
    const { code } = await waitFor(host, "room:created");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");

    const finishedState = await new Promise((resolve) => {
      function onState({ room }) {
        if (room.timer.status === "finished") {
          host.off("room:state", onState);
          resolve(room);
        }
      }
      host.on("room:state", onState);
    });

    expect(finishedState.timer.status).toBe("finished");
    expect(finishedState.timer.remainingSeconds).toBe(0);
  }, 65000);

  it("E2E-B06: un participante vota una tarjeta y ambos reciben el voto reflejado; votar de nuevo lo retira", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance");
      await waitFor(host, "room:state");
    }

    let state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("card:add", { column: "keep", text: "algo bueno" });
    });
    const cardId = state.room.cards[0].id;

    host.emit("phase:advance"); // expression_round
    await waitFor(host, "room:state");
    host.emit("phase:advance"); // grouping_voting
    await waitFor(host, "room:state");

    const hostVotePromise = waitFor(host, "room:state");
    participant.emit("card:vote", { cardId });
    const votedState = await hostVotePromise;
    expect(votedState.room.cards[0].votes).toContain(participant.id);

    const hostUnvotePromise = waitFor(host, "room:state");
    participant.emit("card:vote", { cardId });
    const unvotedState = await hostUnvotePromise;
    expect(unvotedState.room.cards[0].votes).not.toContain(participant.id);
  });

  it("E2E-B07: un cliente reconecta con su sessionToken dentro de la ventana de gracia y conserva su voto", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const joinedPromise = waitFor(participant, "room:joined");
    participant.emit("room:join", { code, name: "Ana" });
    const [, participantJoined] = await Promise.all([waitFor(participant, "room:state"), joinedPromise]);
    const participantToken = participantJoined.sessionToken;

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance");
      await waitFor(host, "room:state");
    }

    let state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("card:add", { column: "keep", text: "algo bueno" });
    });
    const cardId = state.room.cards[0].id;

    host.emit("phase:advance"); // expression_round
    await waitFor(host, "room:state");
    host.emit("phase:advance"); // grouping_voting
    await waitFor(host, "room:state");

    const votedPromise = waitFor(host, "room:state");
    participant.emit("card:vote", { cardId });
    await votedPromise;

    const originalParticipantId = participant.id;
    participant.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reconnected = connectClient();
    const reconnectStatePromise = waitFor(reconnected, "room:state");
    const reconnectJoinedPromise = waitFor(reconnected, "room:joined");
    // El nombre que se manda acá es irrelevante para la reconexión: lo que
    // autentica es el sessionToken (ver room:join en roomHandlers.js).
    reconnected.emit("room:join", { code, name: "Ana", sessionToken: participantToken });
    const [reconnectedState, joinedPayload] = await Promise.all([reconnectStatePromise, reconnectJoinedPromise]);

    // room:joined es la única forma confiable de que el cliente sepa su propia
    // identidad: reconnected.id (el socket.id de la conexión nueva) es distinto
    // del participantId reasignado (el id histórico de Ana, dueño del voto).
    expect(joinedPayload.participantId).toBe(originalParticipantId);
    expect(reconnected.id).not.toBe(originalParticipantId);
    expect(joinedPayload.sessionToken).toBe(participantToken);

    const card = reconnectedState.room.cards.find((c) => c.id === cardId);
    expect(card.votes).toHaveLength(1);
    const reconnectedParticipant = reconnectedState.room.participants.find((p) => p.name === "Ana");
    expect(reconnectedParticipant.connected).toBe(true);
    expect(card.votes[0]).toBe(reconnectedParticipant.id);
    expect(card.votes[0]).toBe(joinedPayload.participantId);
  });

  it("HU-B02b: escribir el nombre exacto del host desconectado, sin su sessionToken, NO da control de host", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code, room: createdRoom } = await waitFor(host, "room:created");
    const hostId = createdRoom.hostId;

    host.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const impostor = connectClient();
    const joinedPromise = waitFor(impostor, "room:joined");
    const statePromise = waitFor(impostor, "room:state");
    impostor.emit("room:join", { code, name: "Cisco" }); // mismo nombre, sin token
    const [joined, state] = await Promise.all([joinedPromise, statePromise]);

    // Entra como alguien nuevo, no como el host: id distinto, y ningún
    // participante nuevo tiene role "host" (sigue siendo el original).
    expect(joined.participantId).not.toBe(hostId);
    const impostorParticipant = state.room.participants.find((p) => p.id === joined.participantId);
    expect(impostorParticipant.role).toBe("participant");
    expect(state.room.hostId).toBe(hostId);

    // Un no-host (el impostor) sigue sin poder avanzar de fase.
    const unauthorizedPromise = waitFor(impostor, "error:unauthorized");
    impostor.emit("phase:advance");
    const error = await unauthorizedPromise;
    expect(error.action).toBe("phase:advance");
  });

  it("escribir el nombre exacto de un participante desconectado, sin su sessionToken, crea a alguien nuevo (no le roba el lugar)", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");
    const originalAnaId = participant.id;

    participant.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const impostor = connectClient();
    const joinedPromise = waitFor(impostor, "room:joined");
    const statePromise = waitFor(impostor, "room:state");
    impostor.emit("room:join", { code, name: "Ana" }); // mismo nombre, sin token
    const [joined, state] = await Promise.all([joinedPromise, statePromise]);

    expect(joined.participantId).not.toBe(originalAnaId);
    // Quedan DOS participantes con nombre "Ana": la original (desconectada,
    // esperando su ventana de gracia) y la nueva.
    const anas = state.room.participants.filter((p) => p.name === "Ana");
    expect(anas).toHaveLength(2);
    expect(anas.find((p) => p.id === originalAnaId).connected).toBe(false);
    expect(anas.find((p) => p.id === joined.participantId).connected).toBe(true);
  });

  it("sessionToken nunca viaja en room:state, ni siquiera al dueño — solo en room:created/room:joined", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { room: createdRoom } = await waitFor(host, "room:created");
    expect(createdRoom.participants[0]).not.toHaveProperty("sessionToken");

    const participant = connectClient();
    const hostStatePromise = waitFor(host, "room:state");
    participant.emit("room:join", { code: createdRoom.code, name: "Ana" });
    const [hostState, participantState] = await Promise.all([hostStatePromise, waitFor(participant, "room:state")]);

    for (const p of hostState.room.participants) expect(p).not.toHaveProperty("sessionToken");
    for (const p of participantState.room.participants) expect(p).not.toHaveProperty("sessionToken");
  });

  it("una vez que la partida arrancó, nadie nuevo (sin sessionToken) puede sumarse — pero sí reconectarse quien ya estaba", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const joinedPromise = waitFor(participant, "room:joined");
    participant.emit("room:join", { code, name: "Ana" });
    const [, participantJoined] = await Promise.all([waitFor(participant, "room:state"), joinedPromise]);
    const participantToken = participantJoined.sessionToken;

    host.emit("phase:start_session");
    await waitFor(host, "room:state");

    // Alguien nuevo, sin haber estado nunca en la sala, no puede sumarse.
    const newcomer = connectClient();
    const lockedPromise = waitFor(newcomer, "room:join_locked");
    newcomer.emit("room:join", { code, name: "Beto" });
    const locked = await lockedPromise;
    expect(locked.code).toBe(code);

    // Ana, que ya estaba, se reconecta sin problema con su token aunque la
    // partida ya haya arrancado (ventana de gracia, HU-B09).
    participant.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reconnected = connectClient();
    const reconnectJoinedPromise = waitFor(reconnected, "room:joined");
    reconnected.emit("room:join", { code, name: "Ana", sessionToken: participantToken });
    const reconnectJoined = await reconnectJoinedPromise;
    expect(reconnectJoined.participantId).toBe(participantJoined.participantId);
  });

  it("E2E-B08: room:join con código inexistente responde room:not_found sin crear estado nuevo", async () => {
    const client = connectClient();
    const notFoundPromise = waitFor(client, "room:not_found");
    client.emit("room:join", { code: "RETRO-ZZZZ", name: "Nadie" });
    const { code } = await notFoundPromise;

    expect(code).toBe("RETRO-ZZZZ");
    expect(roomStore.get("RETRO-ZZZZ")).toBeUndefined();
  });

  it("room:created incluye phaseDurations resuelto con defaults cuando el host no manda ninguno", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { room } = await waitFor(host, "room:created");

    expect(room.phaseDurations.welcome).toBe(180);
    expect(room.phaseDurations.action_plan).toBe(900);
  });

  it("un 4to voto sin toggle responde error:invalid_action", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", starsPerParticipant: 3 });
    const { code } = await waitFor(host, "room:created");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance");
      await waitFor(host, "room:state");
    }

    const cardIds = [];
    for (let i = 0; i < 4; i++) {
      const state = await new Promise((resolve) => {
        host.once("room:state", resolve);
        host.emit("card:add", { column: "keep", text: `card ${i}` });
      });
      cardIds.push(state.room.cards[i].id);
    }

    host.emit("phase:advance"); // expression_round
    await waitFor(host, "room:state");
    host.emit("phase:advance"); // grouping_voting
    await waitFor(host, "room:state");

    for (let i = 0; i < 3; i++) {
      const votePromise = waitFor(host, "room:state");
      host.emit("card:vote", { cardId: cardIds[i] });
      await votePromise;
    }

    const errorPromise = waitFor(host, "error:invalid_action");
    host.emit("card:vote", { cardId: cardIds[3] });
    const error = await errorPromise;
    expect(error.action).toBe("card:vote");
  });

  it("respeta starsPerParticipant configurado (2) al votar con socket real", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", starsPerParticipant: 2 });
    const { room: createdRoom } = await waitFor(host, "room:created");
    expect(createdRoom.starsPerParticipant).toBe(2);

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance");
      await waitFor(host, "room:state");
    }

    const cardIds = [];
    for (let i = 0; i < 3; i++) {
      const state = await new Promise((resolve) => {
        host.once("room:state", resolve);
        host.emit("card:add", { column: "keep", text: `card ${i}` });
      });
      cardIds.push(state.room.cards[i].id);
    }

    host.emit("phase:advance"); // expression_round
    await waitFor(host, "room:state");
    host.emit("phase:advance"); // grouping_voting
    await waitFor(host, "room:state");

    for (let i = 0; i < 2; i++) {
      const votePromise = waitFor(host, "room:state");
      host.emit("card:vote", { cardId: cardIds[i] });
      await votePromise;
    }

    const errorPromise = waitFor(host, "error:invalid_action");
    host.emit("card:vote", { cardId: cardIds[2] });
    const error = await errorPromise;
    expect(error.action).toBe("card:vote");
  });

  it("E2E-B06c: turn:set_speaker actualiza currentSpeakerId para todos, y un no-host es rechazado", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const hostJoinBroadcastPromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana" });
    await Promise.all([waitFor(participant, "room:state"), hostJoinBroadcastPromise]);

    // Un no-host que intenta marcar el turno es rechazado.
    const unauthorizedPromise = waitFor(participant, "error:unauthorized");
    participant.emit("turn:set_speaker", { participantId: participant.id });
    const unauthorizedError = await unauthorizedPromise;
    expect(unauthorizedError.action).toBe("turn:set_speaker");

    // El host sí puede marcar a Ana como oradora, y ambos ven el cambio.
    const hostStatePromise = waitFor(host, "room:state");
    const participantStatePromise = waitFor(participant, "room:state");
    host.emit("turn:set_speaker", { participantId: participant.id });
    const [hostState, participantState] = await Promise.all([hostStatePromise, participantStatePromise]);
    expect(hostState.room.currentSpeakerId).toBe(participant.id);
    expect(participantState.room.currentSpeakerId).toBe(participant.id);

    // turn:clear_speaker limpia el estado para todos.
    const clearedPromise = waitFor(host, "room:state");
    host.emit("turn:clear_speaker");
    const clearedState = await clearedPromise;
    expect(clearedState.room.currentSpeakerId).toBeNull();
  });

  it("E2E-B06d: turn:advance rota al siguiente participante y reinicia el speakerTimer", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", secondsPerSpeaker: 60 });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const hostJoinBroadcastPromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana" });
    await Promise.all([waitFor(participant, "room:state"), hostJoinBroadcastPromise]);

    const setPromise = waitFor(host, "room:state");
    host.emit("turn:set_speaker", { participantId: host.id });
    const setState = await setPromise;
    expect(setState.room.currentSpeakerId).toBe(host.id);
    expect(setState.room.speakerTimer).toEqual({ status: "running", remainingSeconds: 60 });

    const advancePromise = waitFor(host, "room:state");
    host.emit("turn:advance");
    const advancedState = await advancePromise;
    expect(advancedState.room.currentSpeakerId).toBe(participant.id);
    expect(advancedState.room.speakerTimer).toEqual({ status: "running", remainingSeconds: 60 });
  });

  it("E2E-B06e: turn:advance de un no-host es rechazado", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    const unauthorizedPromise = waitFor(participant, "error:unauthorized");
    participant.emit("turn:advance");
    const error = await unauthorizedPromise;
    expect(error.action).toBe("turn:advance");
  });

  it("E2E-B06f: host puede saltar a cualquiera en cualquier momento, reiniciando el speakerTimer", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", secondsPerSpeaker: 60 });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    const hostJoinBroadcastPromise = waitFor(host, "room:state");
    participant.emit("room:join", { code, name: "Ana" });
    await Promise.all([waitFor(participant, "room:state"), hostJoinBroadcastPromise]);

    let state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("turn:set_speaker", { participantId: host.id });
    });
    expect(state.room.currentSpeakerId).toBe(host.id);

    // El host salta directo a Ana sin esperar ni pasar por turn:advance.
    state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("turn:set_speaker", { participantId: participant.id });
    });
    expect(state.room.currentSpeakerId).toBe(participant.id);
    expect(state.room.speakerTimer.remainingSeconds).toBe(60);
  });

  it("E2E-B06g: timer:pause/resume durante expression_round pausan/reanudan speakerTimer, no room.timer", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 3; i++) {
      host.emit("phase:advance"); // previous_action, keep_improve_try, expression_round
      await waitFor(host, "room:state");
    }

    let state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("turn:set_speaker", { participantId: host.id });
    });
    expect(state.room.speakerTimer.status).toBe("running");

    state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("timer:pause");
    });
    expect(state.room.speakerTimer.status).toBe("paused");
    expect(state.room.timer.status).toBe("idle");

    state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("timer:resume");
    });
    expect(state.room.speakerTimer.status).toBe("running");
  });

  it("E2E-B06h: rotación automática al llegar el speakerTimer a 0 (secondsPerSpeaker=30, el mínimo)", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco", secondsPerSpeaker: 30 });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    host.emit("turn:set_speaker", { participantId: host.id });
    await waitFor(host, "room:state");

    // Espera a que el mini-timer llegue a 0 y rote solo, sin ninguna acción del host.
    const rotatedState = await new Promise((resolve) => {
      function onState({ room }) {
        if (room.currentSpeakerId === participant.id) {
          host.off("room:state", onState);
          resolve(room);
        }
      }
      host.on("room:state", onState);
    });

    expect(rotatedState.currentSpeakerId).toBe(participant.id);
    expect(rotatedState.speakerTimer.remainingSeconds).toBe(30);
  }, 35000);

  it("hall_of_fame: el Top 3 se deriva de cards, no requiere ningún evento nuevo del servidor", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance"); // previous_action, keep_improve_try
      await waitFor(host, "room:state");
    }

    const state = await new Promise((resolve) => {
      host.once("room:state", resolve);
      host.emit("card:add", { column: "keep", text: "algo votable" });
    });
    const cardId = state.room.cards[0].id;

    host.emit("phase:advance"); // expression_round
    await waitFor(host, "room:state");
    host.emit("phase:advance"); // grouping_voting
    await waitFor(host, "room:state");

    const votedPromise = waitFor(host, "room:state");
    host.emit("card:vote", { cardId });
    await votedPromise;

    const hallOfFamePromise = waitFor(host, "room:state");
    host.emit("phase:advance"); // hall_of_fame
    const hallOfFameState = await hallOfFamePromise;

    expect(hallOfFameState.room.phase).toBe("hall_of_fame");
    expect(hallOfFameState.room.cards.find((c) => c.id === cardId).votes).toHaveLength(1);
  });

  it("E2E-B09: durante keep_improve_try cada participante solo ve sus propias tarjetas; al avanzar se revelan todas", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance"); // previous_action, keep_improve_try
      await waitFor(host, "room:state");
    }

    const participantStates = [];
    participant.on("room:state", (s) => participantStates.push(s));

    const hostCardPromise = waitFor(host, "room:state");
    host.emit("card:add", { column: "keep", text: "tarjeta del host" });
    const hostStateAfterOwnCard = await hostCardPromise;
    expect(hostStateAfterOwnCard.room.cards).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 50));
    // La tarjeta del host no le llega a Ana mientras la fase sigue activa.
    expect(participantStates.at(-1).room.cards).toHaveLength(0);

    const hostParticipantCardPromise = waitFor(host, "room:state");
    participant.emit("card:add", { column: "keep", text: "tarjeta de Ana" });
    const hostStateAfterParticipantCard = await hostParticipantCardPromise;
    // El host no ve la de Ana todavía, solo la propia.
    expect(hostStateAfterParticipantCard.room.cards.map((c) => c.text)).toEqual(["tarjeta del host"]);

    await new Promise((resolve) => setTimeout(resolve, 50));
    // Ana ve la suya propia, pero sigue sin ver la del host.
    expect(participantStates.at(-1).room.cards.map((c) => c.text)).toEqual(["tarjeta de Ana"]);

    const hostRevealPromise = waitFor(host, "room:state");
    const participantRevealPromise = waitFor(participant, "room:state");
    host.emit("phase:advance"); // expression_round
    const [hostRevealState, participantRevealState] = await Promise.all([hostRevealPromise, participantRevealPromise]);

    expect(hostRevealState.room.cards).toHaveLength(2);
    expect(participantRevealState.room.cards).toHaveLength(2);
  });

  it("E2E-B10: card:edit y card:delete solo funcionan para el autor de la tarjeta", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    const participant = connectClient();
    participant.emit("room:join", { code, name: "Ana" });
    await waitFor(participant, "room:state");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance"); // previous_action, keep_improve_try
      await waitFor(host, "room:state");
    }

    const addPromise = waitFor(host, "room:state");
    host.emit("card:add", { column: "keep", text: "original" });
    const addedState = await addPromise;
    const cardId = addedState.room.cards[0].id;

    const unauthorizedEditPromise = waitFor(participant, "error:unauthorized");
    participant.emit("card:edit", { cardId, text: "hackeado" });
    const editError = await unauthorizedEditPromise;
    expect(editError.action).toBe("card:edit");

    const editPromise = waitFor(host, "room:state");
    host.emit("card:edit", { cardId, text: "editado por el autor" });
    const editedState = await editPromise;
    expect(editedState.room.cards[0].text).toBe("editado por el autor");

    const unauthorizedDeletePromise = waitFor(participant, "error:unauthorized");
    participant.emit("card:delete", { cardId });
    const deleteError = await unauthorizedDeletePromise;
    expect(deleteError.action).toBe("card:delete");

    const deletePromise = waitFor(host, "room:state");
    host.emit("card:delete", { cardId });
    const deletedState = await deletePromise;
    expect(deletedState.room.cards).toHaveLength(0);
  });
});
