import { DEFAULT_STARS_PER_PARTICIPANT } from "../domain/phaseThemes.js";
import type { Room } from "../domain/types.js";

// Cálculo puro de presentación: cuenta cuántas cards de room.cards tienen
// currentParticipantId en su array `votes` y resta del máximo configurado por
// el host (room.starsPerParticipant, ver HU-F01c). No pide nada al servidor
// (regla dura de front.md): se deriva 100% de lo último recibido en
// room:state.
export function useRemainingVotes(room: Room | null | undefined, currentParticipantId: string | null | undefined): number {
  const maxVotes = room?.starsPerParticipant ?? DEFAULT_STARS_PER_PARTICIPANT;
  if (!room || !currentParticipantId) return maxVotes;
  const usedVotes = room.cards.filter((card) => card.votes.includes(currentParticipantId)).length;
  return Math.max(0, maxVotes - usedVotes);
}

export { DEFAULT_STARS_PER_PARTICIPANT as MAX_VOTES_PER_PARTICIPANT };
