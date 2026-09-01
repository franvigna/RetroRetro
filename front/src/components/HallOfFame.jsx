import { topVotedCards } from "../domain/topVotedCards.js";
import { getAvatarById } from "../domain/avatars.js";

const COLUMN_PILL_LABELS = {
  keep: "Keep",
  improve: "Improve",
  try: "Try",
};

// Podio de solo lectura del Nivel 6 (Salón de la Fama): las tarjetas más
// votadas de toda la sesión, calculadas 100% en base a `cards` (ver
// domain/topVotedCards.js, espeja el algoritmo del backend). Sin formulario
// de agregar tarjetas — ver HU-F11 en front.md.
//
// Ranking denso hasta el puesto 10: igual cantidad de votos significa igual
// puesto; el siguiente puntaje distinto avanza un solo puesto.
export function HallOfFame({ cards, participantsById }) {
  const top = topVotedCards(cards, 10);

  if (top.length === 0) {
    return <p className="field-help">Todavía no hay tarjetas votadas para mostrar acá.</p>;
  }

  return (
    <ul className="hall-of-fame">
      {top.map((card, index) => {
        const rank = new Set(top.slice(0, index + 1).map((item) => item.votes.length)).size;
        const authorAvatar = getAvatarById(participantsById[card.authorId]?.avatarId);
        return (
          <li key={card.id} className="hof-item" data-rank={String(rank)}>
            <span className="hof-rank">{rank}º</span>
            <div className="hof-body">
              <div className="hof-card-heading">
                <span className="card-item-text">{card.text}</span>
                {COLUMN_PILL_LABELS[card.column] && (
                  <span className="hof-column-pill" data-column={card.column}>
                    {COLUMN_PILL_LABELS[card.column]}
                  </span>
                )}
              </div>
              <div className="card-item-footer">
                <span className="card-item-author">
                  {authorAvatar && <img src={authorAvatar.src} alt="" width="18" height="18" className="participant-avatar" />}
                  {participantsById[card.authorId]?.name || "Anónimo"}
                </span>
                <span>★ {card.votes.length}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
