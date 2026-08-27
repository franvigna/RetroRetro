import { useState } from "react";
import { AssigneeSelect } from "./AssigneeSelect.jsx";
import { CARD_TEXT_MAX_LENGTH } from "./CardColumn.jsx";

// Formulario de tarjeta de action_plan (Nivel 7 y Game Over): título
// requerido + descripción opcional + responsables opcionales, en vez del
// campo de texto libre simple que usan keep/improve/try (ver shared-contract
// sección 1: Card.title/description/assigneeIds solo aplica a action_plan).
export function ActionPlanForm({ participants, onSubmit, initialValues, submitLabel = "Agregar" }) {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [assigneeIds, setAssigneeIds] = useState(initialValues?.assigneeIds || []);
  const [touched, setTouched] = useState(false);
  const isEditMode = Boolean(initialValues);

  const trimmedTitle = title.trim();
  const isEmpty = touched && trimmedTitle.length === 0;

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!trimmedTitle) return;
    onSubmit({ title: trimmedTitle, description: description.trim(), assigneeIds });
    if (!isEditMode) {
      setTitle("");
      setDescription("");
      setAssigneeIds([]);
      setTouched(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="action-plan-form action-plan-form-row">
      <div className="field action-plan-field-title">
        <label htmlFor="action-plan-title">Título</label>
        <input
          id="action-plan-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Documentar el proceso de deploy"
          maxLength={CARD_TEXT_MAX_LENGTH}
        />
        {isEmpty && <span className="field-error">El título no puede estar vacío.</span>}
      </div>

      <div className="field action-plan-field-description">
        <label htmlFor="action-plan-description">Descripción (opcional)</label>
        <input
          id="action-plan-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Sumá detalle si hace falta..."
          maxLength={CARD_TEXT_MAX_LENGTH}
        />
      </div>

      <AssigneeSelect participants={participants} selectedIds={assigneeIds} onChange={setAssigneeIds} />

      <div className="field action-plan-field-submit">
        <span className="action-plan-submit-spacer" aria-hidden="true">
          &nbsp;
        </span>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
