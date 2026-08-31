// Límite de frecuencia por socket para eventos de escritura (card:add,
// card:vote, room:join, etc.) — sin esto, un solo cliente conectado puede
// inundar una sala con miles de tarjetas o intentos de join en segundos,
// agotando la memoria del proceso (todo el estado vive en RAM, sin DB) o el
// CPU del plan free de Render. No es protección contra un atacante
// distribuido (eso requeriría límite por IP a nivel de infraestructura),
// es el piso mínimo contra un cliente único mal comportado o con un bug.
//
// Ventana deslizante simple: por cada socket + acción, se guarda un array de
// timestamps de los últimos hits. limit() cuenta cuántos caen dentro de la
// ventana; si ya se alcanzó el máximo, rechaza sin agregar el nuevo timestamp.
const hits = new Map();

function keyFor(socketId, action) {
  return `${socketId}:${action}`;
}

export function isRateLimited(socketId, action, { max, windowMs }) {
  const key = keyFor(socketId, action);
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}

// Limpieza al desconectar: evita que el Map crezca indefinidamente con
// entradas de sockets que ya no existen (ver socket/index.js, "disconnect").
export function clearRateLimits(socketId) {
  for (const key of hits.keys()) {
    if (key.startsWith(`${socketId}:`)) {
      hits.delete(key);
    }
  }
}
