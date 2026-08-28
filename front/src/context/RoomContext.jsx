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
    if (!raw) return { code: null, name: null, avatarId: null };
    const parsed = JSON.parse(raw);
    return { code: parsed.code ?? null, name: parsed.name ?? null, avatarId: parsed.avatarId ?? null };
  } catch {
    return { code: null, name: null, avatarId: null };
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
      const { code, name, avatarId } = identityRef.current;
      if (code && name) {
        socket.emit("room:join", { code, name, avatarId });
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

    function handleRoomCreated({ room: createdRoom }) {
      setRoom(createdRoom);
      setCurrentParticipantId(createdRoom.hostId);
    }

    // El participantId asignado puede diferir de socket.id tras una reconexión
    // (se reutiliza el id histórico, ver shared-contract.md sección 4) — nunca
    // asumir que la propia identidad es socket.id.
    function handleRoomJoined({ participantId }) {
      setCurrentParticipantId(participantId);
    }

    function handleRoomState({ room: nextRoom }) {
      setRoom(nextRoom);
      setRoomNotFoundCode(null);
    }

    function handleRoomNotFound({ code }) {
      setRoomNotFoundCode(code);
      // La sala guardada (ej: de una sesión anterior) ya no existe — limpiamos
      // la identidad para no reintentar el auto-join en loop contra un código
      // muerto (ver RoomPage, pendingRejoin).
      identityRef.current = { code: null, name: null, avatarId: null };
      storeIdentity(identityRef.current);
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

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:state", handleRoomState);
    socket.on("room:not_found", handleRoomNotFound);
    socket.on("timer:tick", handleTimerTick);
    socket.on("speaker:tick", handleSpeakerTick);
    socket.on("error:unauthorized", handleUnauthorized);
    socket.on("error:invalid_action", handleInvalidAction);

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
      socket.off("timer:tick", handleTimerTick);
      socket.off("speaker:tick", handleSpeakerTick);
      socket.off("error:unauthorized", handleUnauthorized);
      socket.off("error:invalid_action", handleInvalidAction);
    };
  }, []);

  const createRoom = useCallback((payload) => {
    identityRef.current = { code: null, name: payload.hostName, avatarId: payload.avatarId ?? null };
    storeIdentity(identityRef.current);
    socket.emit("room:create", payload);
  }, []);

  const joinRoom = useCallback((code, name, avatarId = null) => {
    identityRef.current = { code, name, avatarId };
    storeIdentity(identityRef.current);
    socket.emit("room:join", { code, name, avatarId });
  }, []);

  // Salir de la sala explícitamente (ej: botón "Volver al inicio" en Game
  // Over). Limpiamos identityRef para que una reconexión posterior del socket
  // no reintente el join automático a la sala que acabamos de abandonar.
  const leaveRoom = useCallback(() => {
    socket.emit("room:leave");
    identityRef.current = { code: null, name: null, avatarId: null };
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
      pendingRejoin,
      pendingRejoinName,
      createRoom,
      joinRoom,
      leaveRoom,
      clearError,
      clearRoomNotFound,
      socket,
    }),
    [
      room,
      connectionStatus,
      currentParticipantId,
      lastError,
      roomNotFoundCode,
      pendingRejoin,
      pendingRejoinName,
      createRoom,
      joinRoom,
      leaveRoom,
      clearError,
      clearRoomNotFound,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom debe usarse dentro de RoomProvider");
  return ctx;
}
