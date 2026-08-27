// Botón de estrella de puntaje: solo ícono, sin texto (HU-F08b) — el estado
// votado/no votado se comunica con relleno + color de acento (CSS, data-voted)
// y queda accesible vía aria-label/aria-pressed para lectores de pantalla.
export function VoteButton({ voted, remainingVotes, onVote }) {
  const disabled = !voted && remainingVotes <= 0;

  return (
    <button
      type="button"
      className="vote-btn"
      data-voted={String(voted)}
      onClick={(e) => onVote(e.currentTarget)}
      disabled={disabled}
      aria-pressed={voted}
      aria-label={voted ? "Quitar tu estrella de esta tarjeta" : "Dar tu estrella a esta tarjeta"}
    >
      {voted ? "★" : "☆"}
    </button>
  );
}
