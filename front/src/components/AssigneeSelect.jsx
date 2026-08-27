import { useEffect, useRef, useState } from "react";

// Multi-select de responsables para una tarjeta de action_plan: un botón que
// despliega la lista de participantes (checkboxes) recién al tocarlo, en vez
// de ocupar espacio fijo en la fila — "Todo el equipo" marca/desmarca a todos
// de una (ver back.md sección 5: "responsable... puede ser una persona,
// varias, o todo el equipo listando a todos los ids").
export function AssigneeSelect({ participants, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const allSelected = participants.length > 0 && selectedIds.length === participants.length;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(participantId) {
    if (selectedIds.includes(participantId)) {
      onChange(selectedIds.filter((id) => id !== participantId));
    } else {
      onChange([...selectedIds, participantId]);
    }
  }

  function toggleAll() {
    onChange(allSelected ? [] : participants.map((p) => p.id));
  }

  const summary =
    selectedIds.length === 0
      ? "Sin asignar"
      : allSelected
        ? "Todo el equipo"
        : participants
            .filter((p) => selectedIds.includes(p.id))
            .map((p) => p.name)
            .join(", ");

  return (
    <div className="field assignee-select-field" ref={containerRef}>
      <label htmlFor="assignee-select-toggle">Responsables</label>
      <button
        id="assignee-select-toggle"
        type="button"
        className="assignee-select-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {summary}
      </button>
      {open && (
        <div className="assignee-dropdown" role="group" aria-label="Elegí responsables">
          <label className="assignee-option assignee-option-all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Todo el equipo</span>
          </label>
          {participants.map((p) => (
            <label key={p.id} className="assignee-option">
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
