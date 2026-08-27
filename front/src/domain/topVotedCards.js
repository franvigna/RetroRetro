// Top 3 del Salón de la Fama (Nivel 6): espeja exactamente el algoritmo de
// back/src/domain/cards.js (topVotedCards) — misma fuente de datos
// (room.cards ya recibido en room:state), mismo criterio de desempate, para
// que front y back nunca puedan desincronizarse (ver shared-contract.md
// sección 1 y front.md, "el frontend nunca calcula el estado de la sala por
// su cuenta" — esta es la única excepción explícita).
//
// Ordena por votes.length descendente. Si hay empate en el límite del 3er
// puesto, incluye TODAS las tarjetas empatadas (puede devolver más de 3).
export function topVotedCards(cards, limit = 3) {
  if (cards.length === 0) return [];
  const sorted = [...cards].sort((a, b) => b.votes.length - a.votes.length);
  if (sorted.length <= limit) return sorted;

  const cutoffVotes = sorted[limit - 1].votes.length;
  return sorted.filter((c) => c.votes.length >= cutoffVotes);
}
