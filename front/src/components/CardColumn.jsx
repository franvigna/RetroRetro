import { useState } from "react";
import { CardItem } from "./CardItem.jsx";
import { ActionPlanForm } from "./ActionPlanForm.jsx";
import { COLUMN_LABELS, COLUMN_PROMPTS } from "../domain/phaseThemes.js";

export const CARD_TEXT_MAX_LENGTH = 512;

export function CardColumn({
  column,
  cards,
  participantsById,
  participants,
  canAddCard,
  showVote,
  currentParticipantId,
  remainingVotes,
  onAddCard,
  onVote,
  onEditCard,
  onDeleteCard,
}) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const isActionPlan = column === "action_plan";

  const trimmed = text.trim();
  const isEmpty = touched && trimmed.length === 0;

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!trimmed) return;
    onAddCard(column, trimmed);
    setText("");
    setTouched(false);
  }

  return (
    <div className="card-column" data-column={column}>
      <h3 className="card-column-title">{COLUMN_LABELS[column] || column}</h3>
      {COLUMN_PROMPTS[column] && <p className="card-column-prompt">{COLUMN_PROMPTS[column]}</p>}

      {canAddCard && isActionPlan && (
        <ActionPlanForm
          participants={participants || []}
          onSubmit={(payload) => onAddCard(column, payload)}
        />
      )}

      {canAddCard && !isActionPlan && (
        <form onSubmit={handleSubmit} className="field" style={{ marginBottom: 0 }}>
          <input
            id={`card-text-${column}`}
            type="text"
            aria-label="Nueva tarjeta"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí tu aporte..."
            maxLength={CARD_TEXT_MAX_LENGTH}
          />
          {isEmpty && <span className="field-error">La tarjeta no puede estar vacía.</span>}
          <button type="submit" className="btn btn-primary btn-block">
            Agregar
          </button>
        </form>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            authorName={participantsById[card.authorId]?.name}
            participantsById={participantsById}
            participants={participants || []}
            showVote={showVote}
            voted={card.votes.includes(currentParticipantId)}
            remainingVotes={remainingVotes}
            onVote={onVote}
            isOwn={card.authorId === currentParticipantId}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        ))}
      </ul>
    </div>
  );
}
