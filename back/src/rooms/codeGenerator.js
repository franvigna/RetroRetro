const ALPHABET = "23456789ABCDEFGHJKLMNPQRTUVWXYZ";
const CODE_LENGTH = 4;
const PREFIX = "RETRO-";

function randomSegment() {
  let segment = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    segment += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return segment;
}

export function generateRoomCode(existsFn) {
  let code;
  do {
    code = `${PREFIX}${randomSegment()}`;
  } while (existsFn(code));
  return code;
}
