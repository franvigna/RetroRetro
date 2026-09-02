import { useState } from "react";
import { CardItem } from "./CardItem.tsx";
import { ActionPlanForm, type ActionPlanFormValues } from "./ActionPlanForm.tsx";
import { COLUMN_LABELS, COLUMN_PROMPTS } from "../domain/phaseThemes.js";
import type { Card, Participant } from "../domain/types.js";

export const CARD_TEXT_MAX_LENGTH = 512;

export type CardPayload = string | ActionPlanFormValues;
export type ParticipantsById = Record<string, Participant>;

interface CardColumnProps {
  column: string;
  cards: Card[];
  participantsById: ParticipantsById;
  participants?: Participant[];
  canAddCard: boolean;
  showVote: boolean;
  currentParticipantId: string | null;
  remainingVotes: number;
  onAddCard: (column: string, payload: CardPayload) => void;
  onVote: (cardId: string, buttonEl: HTMLButtonElement, voted: boolean) => void;
  onEditCard?: (cardId: string, column: string, payload: CardPayload) => void;
  onDeleteCard?: (cardId: string) => void;
  showPrompts?: boolean;
  highlightedAuthorId?: string | null;
}

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
  showPrompts = true,
  highlightedAuthorId = null,
}: CardColumnProps) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const isActionPlan = column === "action_plan";

  const trimmed = text.trim();
  const isEmpty = touched && trimmed.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!trimmed) return;
    onAddCard(column, trimmed);
    setText("");
    setTouched(false);
  }

  const prompts = COLUMN_PROMPTS[column as keyof typeof COLUMN_PROMPTS];

  return (
    <div className="card-column" data-column={column}>
      <h3 className="card-column-title">{COLUMN_LABELS[column as keyof typeof COLUMN_LABELS] || column}</h3>
      {showPrompts && prompts && (
        <ul className="card-column-prompts">
          {prompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      )}

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
            voted={Boolean(currentParticipantId) && card.votes.includes(currentParticipantId as string)}
            remainingVotes={remainingVotes}
            onVote={onVote}
            isOwn={card.authorId === currentParticipantId}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
            warnCannotRecreate={!canAddCard && !showVote && !isActionPlan}
            isHighlighted={Boolean(highlightedAuthorId) && card.authorId === highlightedAuthorId}
          />
        ))}
      </ul>
    </div>
  );
}
