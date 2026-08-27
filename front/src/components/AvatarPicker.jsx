import { AVATARS } from "../domain/avatars.js";

export function AvatarPicker({ value, onChange }) {
  function handleClick(avatarId) {
    onChange(value === avatarId ? null : avatarId);
  }

  return (
    <div className="field">
      <span className="avatar-picker-label">Elegí un personaje (opcional)</span>
      <div className="avatar-grid" role="group" aria-label="Elegí un personaje (opcional)">
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
    </div>
  );
}
