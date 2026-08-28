import { topVotedCards } from "../domain/topVotedCards.js";
import { getAvatarById } from "../domain/avatars.js";

// Podio de solo lectura del Nivel 6 (Salón de la Fama): las tarjetas más
// votadas de toda la sesión, calculadas 100% en base a `cards` (ver
// domain/topVotedCards.js, espeja el algoritmo del backend). Sin formulario
// de agregar tarjetas — ver HU-F11 en front.md.
//
// Diseño: en vez de un podio de 3 escalones fijos (que no soporta bien el
// caso de empate con más de 3 resultados), se muestra un ranking numerado en
// fila — el primer puesto con un tratamiento visual más grande, y a partir
// del segundo puesto el orden se mantiene por posición aunque haya varios
// tercer-puestos empatados en pantalla.
export function HallOfFame({ cards, participantsById }) {
  const top = topVotedCards(cards, 3);

  if (top.length === 0) {
    return <p className="field-help">Todavía no hay tarjetas votadas para mostrar acá.</p>;
  }

  return (
    <ul className="hall-of-fame">
      {top.map((card, index) => {
        const authorAvatar = getAvatarById(participantsById[card.authorId]?.avatarId);
        return (
          <li key={card.id} className="hof-item" data-rank={index === 0 ? "1" : index === 1 ? "2" : "3"}>
            <span className="hof-rank">{index + 1}º</span>
            <div className="hof-body">
              <span className="card-item-text">{card.text}</span>
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
