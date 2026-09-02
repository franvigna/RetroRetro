import { useState } from "react";
import { AssigneeSelect } from "./AssigneeSelect.tsx";
import { CARD_TEXT_MAX_LENGTH } from "./CardColumn.tsx";
import type { Participant } from "../domain/types.js";

export interface ActionPlanFormValues {
  text: string;
  assigneeIds: string[];
}

interface ActionPlanFormProps {
  participants: Participant[];
  onSubmit: (values: ActionPlanFormValues) => void;
  initialValues?: { text?: string; assigneeIds?: string[] } | null;
  submitLabel?: string;
}

// Formulario de tarjeta de action_plan (Nivel 7 y Game Over): texto de la
// acción concreta requerido + responsables opcionales, en vez del campo de
// texto libre simple que usan keep/improve/try (ver shared-contract sección
// 1: Card.text/assigneeIds solo aplica assigneeIds a action_plan).
export function ActionPlanForm({ participants, onSubmit, initialValues, submitLabel = "Agregar" }: ActionPlanFormProps) {
  const [text, setText] = useState(initialValues?.text || "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialValues?.assigneeIds || []);
  const [touched, setTouched] = useState(false);
  const isEditMode = Boolean(initialValues);

  const trimmedText = text.trim();
  const isEmpty = touched && trimmedText.length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!trimmedText) return;
    onSubmit({ text: trimmedText, assigneeIds });
    if (!isEditMode) {
      setText("");
      setAssigneeIds([]);
      setTouched(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="action-plan-form action-plan-form-row">
      <div className="field action-plan-field-text">
        <label htmlFor="action-plan-text">Acción concreta</label>
        <input
          id="action-plan-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: Documentar el proceso de deploy"
          maxLength={CARD_TEXT_MAX_LENGTH}
        />
        {isEmpty && <span className="field-error">La acción no puede estar vacía.</span>}
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
