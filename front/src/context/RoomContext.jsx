import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { socket } from "../socket/client.js";

const RoomContext = createContext(null);

// Estados posibles de la conexión de socket (HU-F11).
export const CONNECTION_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  SERVER_FULL: "server_full",
};

// Excepción puntual admitida por front.md sección 5: el mínimo necesario
// (código de sala + nombre) para sobrevivir un refresh de página, no para
// estado de sala en general (eso sigue viviendo solo en memoria de React).
const SESSION_STORAGE_KEY = "retroretro:identity";

function loadStoredIdentity() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { code: null, name: null, avatarId: null, sessionToken: null };
    const parsed = JSON.parse(raw);
    return {
      code: parsed.code ?? null,
      name: parsed.name ?? null,
      avatarId: parsed.avatarId ?? null,
      sessionToken: parsed.sessionToken ?? null,
    };
  } catch {
    return { code: null, name: null, avatarId: null, sessionToken: null };
  }
}

function storeIdentity(identity) {
  try {
    if (identity.code && identity.name) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // sessionStorage puede no estar disponible (ej: modo privado estricto) —
    // degradamos a solo-memoria sin romper el flujo.
  }
}

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CONNECTING);
  const [currentParticipantId, setCurrentParticipantId] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [roomNotFoundCode, setRoomNotFoundCode] = useState(null);
  const [roomLockedCode, setRoomLockedCode] = useState(null);

  // Guardamos el nombre usado en el último room:join/room:create para poder
  // reintentar la reconexión si el socket se reconecta (ver room:join en
  // shared-contract.md sección 4), y también para recuperar la sesión tras un
  // refresh de página (HU-F13) — persistido en sessionStorage, nunca
  // localStorage, y limpiado al salir explícitamente de la sala.
  const identityRef = useRef(loadStoredIdentity());

  useEffect(() => {
    function handleConnect() {
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      // Reconexión automática: si ya teníamos code+name (ej: el socket se cayó
      // y volvió a conectar solo), reintentamos el join sin pedirle nada de
      // nuevo a la persona usuaria. room:joined nos va a confirmar el
      // participantId real (puede diferir de socket.id, ver handleRoomJoined).
      // sessionToken es la credencial real de esa reconexión — el servidor la
      // exige para devolvernos la MISMA identidad en vez de crear una nueva
      // (ver room:join en back/src/socket/handlers/roomHandlers.js).
      const { code, name, avatarId, sessionToken } = identityRef.current;
      if (code && name) {
        socket.emit("room:join", { code, name, avatarId, sessionToken });
      }
    }

    function handleDisconnect() {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    }

    function handleConnectError(err) {
      // El servidor rechaza conexiones nuevas por encima de su tope de
      // capacidad (ver back/src/socket/index.js, MAX_CONCURRENT_CONNECTIONS)
      // devolviendo este mensaje puntual — se distingue de un corte de red
      // normal para no reintentar en loop contra un servidor lleno.
      if (err?.message === "server_full") {
        setConnectionStatus(CONNECTION_STATUS.SERVER_FULL);
        socket.disconnect();
        return;
      }
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    }

    function handleRoomCreated({ room: createdRoom, sessionToken }) {
      setRoom(createdRoom);
      setCurrentParticipantId(createdRoom.hostId);
      // sessionToken es la credencial privada de reconexión del host — nunca
      // viaja en `room` (ver back/src/domain/room.js, toPublicRoom), solo acá.
      identityRef.current = { ...identityRef.current, sessionToken };
      storeIdentity(identityRef.current);
    }

    // El participantId asignado puede diferir de socket.id tras una reconexión
    // (se reutiliza el id histórico, ver shared-contract.md sección 4) — nunca
    // asumir que la propia identidad es socket.id.
    function handleRoomJoined({ participantId, sessionToken }) {
      setCurrentParticipantId(participantId);
      identityRef.current = { ...identityRef.current, sessionToken };
      storeIdentity(identityRef.current);
    }

    function handleRoomState({ room: nextRoom }) {
      setRoom(nextRoom);
      setRoomNotFoundCode(null);
      setRoomLockedCode(null);
    }

    function handleRoomNotFound({ code }) {
      setRoomNotFoundCode(code);
      // La sala guardada (ej: de una sesión anterior) ya no existe — limpiamos
      // la identidad para no reintentar el auto-join en loop contra un código
      // muerto (ver RoomPage, pendingRejoin).
      identityRef.current = { code: null, name: null, avatarId: null, sessionToken: null };
      storeIdentity(identityRef.current);
    }

    // La partida ya arrancó y quien intentó entrar no tenía un lugar previo
    // en la sala (sin sessionToken válido) — ver room:join en
    // back/src/socket/handlers/roomHandlers.js e isRoomLockedForNewJoins.
    function handleRoomJoinLocked({ code }) {
      setRoomLockedCode(code);
    }

    function handleTimerTick({ remainingSeconds }) {
      setRoom((prev) => (prev ? { ...prev, timer: { ...prev.timer, remainingSeconds } } : prev));
    }

    // Mismo patrón optimista que timer:tick, pero para el mini-timer de
    // rotación del Nivel 4 (ver shared-contract.md "Rotación automática del
    // Nivel 4"). speakerTimer nunca se calcula localmente, solo se refleja.
    function handleSpeakerTick({ remainingSeconds }) {
      setRoom((prev) =>
        prev?.speakerTimer ? { ...prev, speakerTimer: { ...prev.speakerTimer, remainingSeconds } } : prev
      );
    }

    function handleUnauthorized(payload) {
      setLastError({ type: "unauthorized", ...payload });
    }

    function handleInvalidAction(payload) {
      setLastError({ type: "invalid_action", ...payload });
    }

    // El servidor frena eventos repetidos en muy poco tiempo (spam de
    // tarjetas/votos/joins) — ver back/src/socket/rateLimiter.js. En uso
    // normal esto no debería dispararse nunca.
    function handleRateLimited(payload) {
      setLastError({ type: "rate_limited", ...payload });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:state", handleRoomState);
    socket.on("room:not_found", handleRoomNotFound);
    socket.on("room:join_locked", handleRoomJoinLocked);
    socket.on("timer:tick", handleTimerTick);
    socket.on("speaker:tick", handleSpeakerTick);
    socket.on("error:unauthorized", handleUnauthorized);
    socket.on("error:invalid_action", handleInvalidAction);
    socket.on("error:rate_limited", handleRateLimited);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:state", handleRoomState);
      socket.off("room:not_found", handleRoomNotFound);
      socket.off("room:join_locked", handleRoomJoinLocked);
      socket.off("timer:tick", handleTimerTick);
      socket.off("speaker:tick", handleSpeakerTick);
      socket.off("error:unauthorized", handleUnauthorized);
      socket.off("error:invalid_action", handleInvalidAction);
      socket.off("error:rate_limited", handleRateLimited);
    };
  }, []);

  const createRoom = useCallback((payload) => {
    identityRef.current = { code: null, name: payload.hostName, avatarId: payload.avatarId ?? null, sessionToken: null };
    storeIdentity(identityRef.current);
    socket.emit("room:create", payload);
  }, []);

  // Un join manual (formulario "Unirse a sala" o "Reconectar") nunca manda
  // sessionToken: por definición no hay uno guardado para esa sala en este
  // browser, si no ya se habría reconectado solo (ver handleConnect). El
  // servidor va a tratar esto como un participante nuevo y nos va a emitir
  // uno propio en room:joined.
  const joinRoom = useCallback((code, name, avatarId = null) => {
    identityRef.current = { code, name, avatarId, sessionToken: null };
    storeIdentity(identityRef.current);
    socket.emit("room:join", { code, name, avatarId });
  }, []);

  // Salir de la sala explícitamente (ej: botón "Volver al inicio" en Game
  // Over). Limpiamos identityRef para que una reconexión posterior del socket
  // no reintente el join automático a la sala que acabamos de abandonar.
  const leaveRoom = useCallback(() => {
    socket.emit("room:leave");
    identityRef.current = { code: null, name: null, avatarId: null, sessionToken: null };
    storeIdentity(identityRef.current);
    setRoom(null);
    setCurrentParticipantId(null);
  }, []);

  // Cuando room:created llega, ya sabemos el code definitivo generado por el
  // servidor: lo guardamos para que una reconexión posterior (o un refresh de
  // página, ver HU-F13) use ese code.
  useEffect(() => {
    if (room?.code) {
      identityRef.current = { ...identityRef.current, code: room.code };
      storeIdentity(identityRef.current);
    }
  }, [room?.code]);

  const clearError = useCallback(() => setLastError(null), []);
  const clearRoomNotFound = useCallback(() => setRoomNotFoundCode(null), []);
  const clearRoomLocked = useCallback(() => setRoomLockedCode(null), []);

  // Identidad recuperada de sessionStorage (ej: tras un F5) para la que
  // todavía no llegó room:state — usada por RoomPage para mostrar "conectando"
  // en vez de pedir el nombre de nuevo mientras el auto-join está en curso.
  const pendingRejoin = !room && Boolean(identityRef.current.code && identityRef.current.name);
  const pendingRejoinName = identityRef.current.name;

  const value = useMemo(
    () => ({
      room,
      connectionStatus,
      currentParticipantId,
      lastError,
      roomNotFoundCode,
      roomLockedCode,
      pendingRejoin,
      pendingRejoinName,
      createRoom,
      joinRoom,
      leaveRoom,
      clearError,
      clearRoomNotFound,
      clearRoomLocked,
      socket,
    }),
    [
      room,
      connectionStatus,
      currentParticipantId,
      lastError,
      roomNotFoundCode,
      roomLockedCode,
      pendingRejoin,
      pendingRejoinName,
      createRoom,
      joinRoom,
      leaveRoom,
      clearError,
      clearRoomNotFound,
      clearRoomLocked,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom debe usarse dentro de RoomProvider");
  return ctx;
}
