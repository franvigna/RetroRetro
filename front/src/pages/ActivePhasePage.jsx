import { useRef, useState, useCallback } from "react";
import { useRoom } from "../context/RoomContext.jsx";
import { useRoomEvents } from "../hooks/useRoomEvents.js";
import { useRemainingVotes } from "../hooks/useRemainingVotes.js";
import { Timer } from "../components/Timer.jsx";
import { HostControls } from "../components/HostControls.jsx";
import { CardColumn } from "../components/CardColumn.jsx";
import { StarsHeader } from "../components/StarsHeader.jsx";
import { FlyingStar } from "../components/FlyingStar.jsx";
import { SpeakerList } from "../components/SpeakerList.jsx";
import { HallOfFame } from "../components/HallOfFame.jsx";
import { TimerFinishedBanner } from "../components/TimerFinishedBanner.jsx";
import { SpeakerRotationWarning } from "../components/SpeakerRotationWarning.jsx";
import { PreviousActionPanel } from "../components/PreviousActionPanel.jsx";
import { RoomSettingsPanel } from "../components/RoomSettingsPanel.jsx";
import { PHASE_THEMES, CARD_COLUMNS_BY_PHASE } from "../domain/phaseThemes.js";

const SPEAKER_ROTATION_WARNING_THRESHOLD_SECONDS = 5;

export function ActivePhasePage() {
  const { room, currentParticipantId } = useRoom();
  const {
    advancePhase,
    goBackPhase,
    pauseTimer,
    resumeTimer,
    addTime,
    addCard,
    voteCard,
    editCard,
    deleteCard,
    setSpeaker,
    clearSpeaker,
    setPreviousActionItem,
    updateRoomSettings,
    closeRoom,
  } = useRoomEvents();
  const remainingVotes = useRemainingVotes(room, currentParticipantId);

  const starsHeaderRef = useRef(null);
  const [flyingStar, setFlyingStar] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = room.participants.find((p) => p.id === currentParticipantId);
  const isHost = me?.role === "host";
  const theme = PHASE_THEMES[room.phase];

  const participantsById = Object.fromEntries(room.participants.map((p) => [p.id, p]));

  const isExpressionRound = room.phase === "expression_round";
  const columnsForPhase = CARD_COLUMNS_BY_PHASE[room.phase];
  const isVotingPhase = room.phase === "grouping_voting";
  // En grouping_voting y expression_round se muestran las columnas de
  // keep_improve_try ya escritas en el nivel anterior — sin voto en
  // expression_round (todavía no llegamos a esa fase), con voto en
  // grouping_voting. En ambos casos no se pueden agregar tarjetas nuevas,
  // solo editar/eliminar las propias (ver onEditCard/onDeleteCard más abajo).
  const showsPastCards = isVotingPhase || isExpressionRound;
  const columnsToShow = showsPastCards ? CARD_COLUMNS_BY_PHASE.keep_improve_try : columnsForPhase;

  // Envuelve voteCard para animar "la estrella viaja" entre el header de
  // estrellas disponibles y la tarjeta votada (HU-F08b). El toggle real de
  // voto lo decide siempre el servidor (room:state) — esto es puramente
  // presentación: no calculamos si el voto se acepta o no.
  const handleVote = useCallback(
    (cardId, buttonEl, alreadyVoted) => {
      const headerRect = starsHeaderRef.current?.getBoundingClientRect();
      const buttonRect = buttonEl?.getBoundingClientRect();
      if (headerRect && buttonRect) {
        setFlyingStar({
          key: `${cardId}-${Date.now()}`,
          from: alreadyVoted ? buttonRect : headerRect,
          to: alreadyVoted ? headerRect : buttonRect,
        });
      }
      voteCard(cardId);
    },
    [voteCard]
  );

  return (
    <div className="page page-wide">
      <div className="btn-row" style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h1 className="brand-title pixel-text">{theme.title}</h1>
          <p className="brand-tagline">{theme.subtitle}</p>
        </div>
        {isHost && (
          <button
            type="button"
            className="card-item-action-btn"
            aria-label="Configuración de la sala"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        )}
      </div>

      <div className="cabinet" style={{ width: "100%" }}>
        <div className="cabinet-bezel" />
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <p className="cabinet-subtitle" style={{ margin: 0 }}>
            {theme.description}
          </p>
          {/* expression_round no tiene timer de fase (usa speakerTimer en su
              lugar, ver SpeakerList más abajo) — ocultar el timer tradicional
              ahí evita mostrar un "00:00" idle que no representa nada. */}
          {!isExpressionRound && <Timer timer={room.timer} />}
        </div>

        {!isExpressionRound && room.timer.status === "finished" && (
          <TimerFinishedBanner isHost={isHost} onAddTime={addTime} onAdvance={advancePhase} />
        )}

        {room.phase === "welcome" && (
          <p>
            Bienvenidos a RetroRetro: la retrospectiva del equipo, con estética retro. La sesión
            avanza en niveles: en cada uno vas a tener un tiempo límite visible para todos, y
            cuando se cumple, el anfitrión avanza al siguiente. Vamos a repasar qué funcionó, qué
            mejorar y qué probar, darle a cada uno su turno para opinar, votar entre todos lo más
            importante, y cerrar con un plan de acción concreto. ¡Que empiece el juego!
          </p>
        )}

        {room.phase === "previous_action" && (
          <PreviousActionPanel
            notes={room.previousActionNotes}
            checks={room.previousActionChecks}
            onSetItem={setPreviousActionItem}
            canToggle
          />
        )}

        {isExpressionRound && (
          <>
            <SpeakerList
              participants={room.participants}
              currentSpeakerId={room.currentSpeakerId}
              speakerTimer={room.speakerTimer}
              isHost={isHost}
              onSetSpeaker={setSpeaker}
              onClearSpeaker={clearSpeaker}
            />
            {room.speakerTimer?.status === "running" &&
              room.speakerTimer.remainingSeconds <= SPEAKER_ROTATION_WARNING_THRESHOLD_SECONDS && (
                <SpeakerRotationWarning
                  participants={room.participants}
                  currentSpeakerId={room.currentSpeakerId}
                  remainingSeconds={room.speakerTimer.remainingSeconds}
                />
              )}
          </>
        )}

        {room.phase === "hall_of_fame" && (
          <HallOfFame cards={room.cards} participantsById={participantsById} />
        )}

        {isVotingPhase && (
          <StarsHeader ref={starsHeaderRef} total={room.starsPerParticipant} remaining={remainingVotes} />
        )}

        {columnsToShow && (
          <div className="card-columns">
            {columnsToShow.map((column) => (
              <CardColumn
                key={column}
                column={column}
                cards={room.cards.filter((c) => c.column === column)}
                participantsById={participantsById}
                participants={room.participants}
                canAddCard={!showsPastCards && columnsForPhase?.includes(column)}
                showVote={isVotingPhase}
                currentParticipantId={currentParticipantId}
                remainingVotes={remainingVotes}
                onAddCard={addCard}
                onVote={handleVote}
                onEditCard={!isVotingPhase ? editCard : undefined}
                onDeleteCard={!isVotingPhase ? deleteCard : undefined}
              />
            ))}
          </div>
        )}

        <HostControls
          role={me?.role}
          timerStatus={isExpressionRound ? room.speakerTimer?.status ?? "idle" : room.timer.status}
          onAdvance={advancePhase}
          onGoBack={goBackPhase}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onAddTime={addTime}
          canGoBack={room.phaseHistory.length > 0}
          showTimeControls={!isExpressionRound}
        />
      </div>

      {flyingStar && (
        <FlyingStar
          key={flyingStar.key}
          from={flyingStar.from}
          to={flyingStar.to}
          onDone={() => setFlyingStar(null)}
        />
      )}

      {settingsOpen && (
        <RoomSettingsPanel
          room={room}
          onUpdateSettings={updateRoomSettings}
          onCloseRoom={closeRoom}
          onDismiss={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
