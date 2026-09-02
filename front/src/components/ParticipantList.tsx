import { getAvatarById } from "../domain/avatars.js";
import type { Participant } from "../domain/types.js";

export function ParticipantList({ participants }: { participants: Participant[] | null | undefined }) {
  if (!participants || participants.length === 0) {
    return <p className="field-help">Todavía no hay nadie en la sala.</p>;
  }

  return (
    <ul className="participant-list">
      {participants.map((p) => {
        const avatar = getAvatarById(p.avatarId);
        return (
          <li key={p.id} className="participant-item" data-connected={String(p.connected)}>
            {avatar && <img src={avatar.src} alt="" width="20" height="20" className="participant-avatar" />}
            <span>{p.name}</span>
            {p.role === "host" && <span className="participant-badge">HOST</span>}
          </li>
        );
      })}
    </ul>
  );
}
