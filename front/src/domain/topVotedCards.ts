import type { Card } from "./types.js";

// Top 10 del Salón de la Fama (Nivel 6): espeja exactamente el algoritmo de
// back/src/domain/cards.ts (topVotedCards) — misma fuente de datos
// (room.cards ya recibido en room:state), mismo criterio de desempate, para
// que front y back nunca puedan desincronizarse (ver shared-contract.md
// sección 1 y front.md, "el frontend nunca calcula el estado de la sala por
// su cuenta" — esta es la única excepción explícita).
//
// El ranking es denso: cantidades de votos iguales comparten puesto y el
// siguiente puntaje distinto ocupa el puesto siguiente (1, 1, 2, 2, 3...).
// Se incluyen todos los empates del puesto 10, por lo que pueden mostrarse
// más de diez tarjetas.
export function topVotedCards(cards: Card[], maxRank = 10): Card[] {
  const votedCards = cards.filter((card) => card.votes.length > 0);
  if (votedCards.length === 0) return [];
  const sorted = [...votedCards].sort((a, b) => b.votes.length - a.votes.length);
  const topVoteCounts = [...new Set(sorted.map((card) => card.votes.length))].slice(0, maxRank);
  return sorted.filter((card) => topVoteCounts.includes(card.votes.length));
}
