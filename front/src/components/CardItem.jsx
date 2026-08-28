import { useState } from "react";
import { VoteButton } from "./VoteButton.jsx";
import { ActionPlanForm } from "./ActionPlanForm.jsx";
import { getAvatarById } from "../domain/avatars.js";

// Todas las columnas usan `card.text`; action_plan además usa `assigneeIds`
// (ver shared-contract.md sección 1) — este componente resuelve los nombres
// de los responsables a partir de `participantsById` porque `assigneeIds`
// solo trae ids, nunca nombres.
//
// Edición/eliminación (HU-F09c): solo visibles si `isOwn` (soy el autor).
// Lápiz o doble click habilitan edición inline; "X" elimina sin confirmación.
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
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(card.text || "");
  const isActionPlan = card.column === "action_plan";
  const assigneeNames = isActionPlan
    ? (card.assigneeIds || []).map((id) => participantsById?.[id]?.name || "?")
    : [];
  const authorAvatar = getAvatarById(participantsById?.[card.authorId]?.avatarId);

  const canEdit = isOwn && Boolean(onEdit) && Boolean(onDelete);

  function startEditing() {
    if (!canEdit) return;
    setText(card.text || "");
    setIsEditing(true);
  }

  function handleSimpleEditSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onEdit(card.id, card.column, trimmed);
    setIsEditing(false);
  }

  function handleActionPlanEditSubmit(payload) {
    onEdit(card.id, card.column, payload);
    setIsEditing(false);
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
    <li className="card-item" onDoubleClick={startEditing}>
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
            onClick={() => onDelete(card.id)}
          >
            ✕
          </button>
        </div>
      )}

      {isActionPlan ? (
        <>
          <span className="card-item-title">{card.text}</span>
          {assigneeNames.length > 0 && (
            <span className="card-item-assignees">Responsables: {assigneeNames.join(", ")}</span>
          )}
        </>
      ) : (
        <span className="card-item-text">{card.text}</span>
      )}
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
    </li>
  );
}
