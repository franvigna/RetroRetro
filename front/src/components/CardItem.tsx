import { useState } from "react";
import { VoteButton } from "./VoteButton.tsx";
import { ActionPlanForm } from "./ActionPlanForm.tsx";
import { getAvatarById } from "../domain/avatars.js";
import type { Card, Participant } from "../domain/types.js";
import type { CardPayload, ParticipantsById } from "./CardColumn.tsx";

interface AssigneeDisplay {
  id: string;
  name: string;
  avatarId: string | null;
}

interface CardItemProps {
  card: Card;
  authorName?: string;
  participantsById?: ParticipantsById;
  participants?: Participant[];
  showVote: boolean;
  voted: boolean;
  remainingVotes: number;
  onVote: (cardId: string, buttonEl: HTMLButtonElement, voted: boolean) => void;
  isOwn: boolean;
  onEdit?: (cardId: string, column: string, payload: CardPayload) => void;
  onDelete?: (cardId: string) => void;
  warnCannotRecreate?: boolean;
  isHighlighted?: boolean;
}

// Todas las columnas usan `card.text`; action_plan además usa `assigneeIds`
// (ver shared-contract.md sección 1) — este componente resuelve los nombres
// de los responsables a partir de `participantsById` porque `assigneeIds`
// solo trae ids, nunca nombres.
//
// Edición/eliminación (HU-F09c): solo visibles si `isOwn` (soy el autor).
// Lápiz o doble click habilitan edición inline; "X" abre una confirmación
// pequeña antes de eliminar para evitar pérdidas accidentales.
export function CardItem({
  card,
  authorName,
  participantsById,
  participants,
  showVote,
  voted,
  remainingVotes,
  onVote,
  isOwn,
  onEdit,
  onDelete,
  warnCannotRecreate = false,
  isHighlighted = false,
}: CardItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [text, setText] = useState(card.text || "");
  const isActionPlan = card.column === "action_plan";
  const assignees: AssigneeDisplay[] = isActionPlan
    ? (card.assigneeIds || []).map((id) => participantsById?.[id] || { id, name: "?", avatarId: null })
    : [];
  const authorAvatar = getAvatarById(participantsById?.[card.authorId]?.avatarId);

  const canEdit = isOwn && Boolean(onEdit) && Boolean(onDelete);

  function startEditing() {
    if (!canEdit) return;
    setIsConfirmingDelete(false);
    setText(card.text || "");
    setIsEditing(true);
  }

  function handleSimpleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onEdit?.(card.id, card.column, trimmed);
    setIsEditing(false);
  }

  function handleActionPlanEditSubmit(payload: CardPayload) {
    onEdit?.(card.id, card.column, payload);
    setIsEditing(false);
  }

  function confirmDelete() {
    onDelete?.(card.id);
    setIsConfirmingDelete(false);
  }

  if (isEditing && isActionPlan) {
    return (
      <li className="card-item card-item-editing">
        <ActionPlanForm
          participants={participants || []}
          initialValues={{ text: card.text, assigneeIds: card.assigneeIds }}
          submitLabel="Guardar"
          onSubmit={handleActionPlanEditSubmit}
        />
      </li>
    );
  }

  if (isEditing) {
    return (
      <li className="card-item card-item-editing">
        <form onSubmit={handleSimpleEditSubmit} className="field" style={{ marginBottom: 0 }}>
          <label htmlFor={`card-edit-${card.id}`}>Editar tarjeta</label>
          <input
            id={`card-edit-${card.id}`}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="card-item" data-speaker-card={isHighlighted ? "true" : undefined} onDoubleClick={startEditing}>
      {canEdit && (
        <div className="card-item-actions">
          <button
            type="button"
            className="card-item-action-btn"
            aria-label="Editar tarjeta"
            onClick={startEditing}
          >
            ✎
          </button>
          <button
            type="button"
            className="card-item-action-btn"
            aria-label="Eliminar tarjeta"
            aria-expanded={isConfirmingDelete}
            onClick={() => setIsConfirmingDelete((current) => !current)}
          >
            ✕
          </button>
          {isConfirmingDelete && (
            <div className="card-delete-confirmation" role="alert">
              <p>¿Seguro que queres eliminar esta tarjeta?</p>
              {warnCannotRecreate && (
                <p className="card-delete-warning">En el Nivel 4 no se pueden agregar tarjetas nuevas.</p>
              )}
              <div className="card-delete-confirmation-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsConfirmingDelete(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isActionPlan ? (
        <>
          <span className="card-item-title">{card.text}</span>
          {assignees.length > 0 && (
            <div className="card-item-assignees">
              <span>Responsables:</span>
              <ul className="card-item-assignee-list">
                {assignees.map((assignee) => {
                  const assigneeAvatar = getAvatarById(assignee.avatarId);
                  return (
                    <li key={assignee.id} className="card-item-assignee">
                      {assigneeAvatar && (
                        <img
                          src={assigneeAvatar.src}
                          alt=""
                          width="18"
                          height="18"
                          className="participant-avatar"
                        />
                      )}
                      {assignee.name}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <span className="card-item-text">{card.text}</span>
          <div className="card-item-footer">
            <span className="card-item-author">
              {authorAvatar && <img src={authorAvatar.src} alt="" width="18" height="18" className="participant-avatar" />}
              {authorName || "Anónimo"}
            </span>
            {showVote ? (
              <VoteButton
                voted={voted}
                remainingVotes={remainingVotes}
                onVote={(buttonEl) => onVote(card.id, buttonEl, voted)}
              />
            ) : (
              card.votes.length > 0 && <span>★ {card.votes.length}</span>
            )}
          </div>
        </>
      )}
    </li>
  );
}
