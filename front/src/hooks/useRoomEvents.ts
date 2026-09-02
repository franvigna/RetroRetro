import { useCallback } from "react";
import { useRoom } from "../context/RoomContext.jsx";

type SimpleCardPayload = string;
interface ActionPlanCardPayload {
  text: string;
  assigneeIds?: string[];
}

// Acciones de sala que cualquier pantalla de nivel puede necesitar disparar.
// La suscripción a los eventos entrantes (room:state, timer:tick, errores,
// etc.) vive en RoomContext — este hook es solo la salida (cliente -> server).
export function useRoomEvents() {
  const { socket } = useRoom();

  const startSession = useCallback(() => socket.emit("phase:start_session"), [socket]);
  const advancePhase = useCallback(() => socket.emit("phase:advance"), [socket]);
  const goBackPhase = useCallback(() => socket.emit("phase:go_back"), [socket]);
  const setPreviousActionItem = useCallback(
    (index: number, done: boolean | null) => socket.emit("phase:set_previous_action_item", { index, done }),
    [socket]
  );
  const pauseTimer = useCallback(() => socket.emit("timer:pause"), [socket]);
  const resumeTimer = useCallback(() => socket.emit("timer:resume"), [socket]);
  const addTime = useCallback((seconds: number) => socket.emit("timer:add_time", { seconds }), [socket]);
  // keep/improve/try: (column, text). action_plan: (column, { text, assigneeIds }) —
  // ver CardColumn.jsx, que arma el payload correcto según la columna.
  const addCard = useCallback(
    (column: string, payload: SimpleCardPayload | ActionPlanCardPayload) => {
      if (column === "action_plan") {
        const { text, assigneeIds } = payload as ActionPlanCardPayload;
        socket.emit("card:add", { column, text, assigneeIds });
      } else {
        socket.emit("card:add", { column, text: payload as SimpleCardPayload });
      }
    },
    [socket]
  );
  const voteCard = useCallback((cardId: string) => socket.emit("card:vote", { cardId }), [socket]);
  // Mismo shape dual que addCard: keep/improve/try manda text plano, action_plan
  // manda { text, assigneeIds } (ver CardItem.jsx).
  const editCard = useCallback(
    (cardId: string, column: string, payload: SimpleCardPayload | ActionPlanCardPayload) => {
      if (column === "action_plan") {
        const { text, assigneeIds } = payload as ActionPlanCardPayload;
        socket.emit("card:edit", { cardId, text, assigneeIds });
      } else {
        socket.emit("card:edit", { cardId, text: payload as SimpleCardPayload });
      }
    },
    [socket]
  );
  const deleteCard = useCallback((cardId: string) => socket.emit("card:delete", { cardId }), [socket]);
  const setSpeaker = useCallback((participantId: string) => socket.emit("turn:set_speaker", { participantId }), [socket]);
  const clearSpeaker = useCallback(() => socket.emit("turn:clear_speaker"), [socket]);
  const advanceSpeaker = useCallback(() => socket.emit("turn:advance"), [socket]);
  const leaveRoom = useCallback(() => socket.emit("room:leave"), [socket]);
  const updateRoomSettings = useCallback(
    (starsPerParticipant: number) => socket.emit("room:update_settings", { starsPerParticipant }),
    [socket]
  );
  const closeRoom = useCallback(() => socket.emit("room:close"), [socket]);

  return {
    startSession,
    advancePhase,
    goBackPhase,
    setPreviousActionItem,
    pauseTimer,
    resumeTimer,
    addTime,
    addCard,
    voteCard,
    editCard,
    deleteCard,
    setSpeaker,
    clearSpeaker,
    advanceSpeaker,
    leaveRoom,
    updateRoomSettings,
    closeRoom,
  };
}
