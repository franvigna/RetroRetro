import { AVATARS } from "../domain/avatars.js";

// Si todavía no hay ningún avatar cargado (ver avatars.js) no mostramos una
// sección "Elegí un personaje" vacía y rota — directamente no renderiza nada.
export function AvatarPicker({ value, onChange, required = false, showError = false }) {
  function handleClick(avatarId) {
    onChange(value === avatarId ? null : avatarId);
  }

  if (AVATARS.length === 0) return null;

  return (
    <div className="field">
      <span className="avatar-picker-label">Elegí un personaje{required ? "" : " (opcional)"}</span>
      <div className="avatar-grid" role="group" aria-label="Elegí un personaje">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className="avatar-option"
            data-selected={String(value === avatar.id)}
            aria-pressed={value === avatar.id}
            aria-label={avatar.label}
            onClick={() => handleClick(avatar.id)}
          >
            <img src={avatar.src} alt="" width="32" height="32" />
          </button>
        ))}
      </div>
      {required && showError && !value && <span className="field-error">Elegí un personaje para continuar.</span>}
    </div>
  );
}
