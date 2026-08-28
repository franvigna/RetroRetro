# shared-contract.md — Contrato de eventos de Socket.io

Este documento es la **fuente de verdad** de los eventos en tiempo real entre `front/` y `back/`.
Si hay una inconsistencia entre este archivo y `front.md` o `back.md`, este archivo tiene
prioridad. Cualquier cambio en nombres de eventos o forma de los payloads debe actualizarse acá
primero.

Convención de nombres: `namespace:accion` en minúsculas, con dos puntos como separador.

> Nota de nomenclatura: los eventos y campos internos (`card:vote`, `votes`, etc.) mantienen el
> nombre genérico "vote/voto" a nivel de código y protocolo, aunque en la interfaz visual
> (temática "Retro Arcade", ver `CLAUDE.md`) se muestren como "estrella de puntaje". Esto evita
> acoplar el contrato técnico a un nombre de tema que podría volver a cambiar en el futuro.

---

## 1. Modelo de estado de una sala (Room)

Este es el "shape" del estado que vive en el servidor por cada sala activa. Server es la única
fuente de verdad — el cliente nunca calcula este estado por su cuenta, solo lo refleja.

```ts
type Role = "host" | "participant";

type Phase =
  | "waiting_room"      // "Insertar moneda" — sala de espera, sin timer
  | "welcome"           // Nivel 1 — bienvenida y reglas
  | "previous_action"   // Nivel 2 (opcional) — Continue? (puntaje anterior)
  | "keep_improve_try"  // Nivel 3 — Keep / Improve / Try
  | "expression_round"  // Nivel 4 — Turno de jugador: ronda de expresión verbal, sin tarjetas. Sin timer de fase (ver "Rotación automática del Nivel 4" más abajo) — usa speakerTimer en su lugar.
  | "grouping_voting"   // Nivel 5 — ranking de estrellas
  | "hall_of_fame"      // Nivel 6 — Salón de la Fama: top 3 tarjetas más votadas, calculado automáticamente (no es un tema definido de antemano)
  | "action_plan"       // Nivel 7 — guardar partida
  | "closing";          // Game Over — High Score

type TimerStatus = "idle" | "running" | "paused" | "finished";

interface TimerState {
  status: TimerStatus;
  durationSeconds: number;     // duración total configurada para la fase actual
  remainingSeconds: number;    // segundos restantes (se actualiza en el server, no en el cliente)
}

// Mini-timer de rotación del Nivel 4 (ver sección "Rotación automática del Nivel 4"). null
// cuando currentSpeakerId es null (nadie tiene la palabra todavía).
interface SpeakerTimerState {
  status: "running" | "paused";
  remainingSeconds: number;
}

interface Participant {
  id: string;          // socket.id
  name: string;
  role: Role;
  connected: boolean;  // false si se desconectó pero la sala lo mantiene por si vuelve
  avatarId: string | null;  // uno de AVATAR_IDS (ver más abajo), o null si no eligió avatar
}
```

**Avatares (`avatarId`):** set fijo y cerrado de 48 personajes pixel-art 100% originales, con
hombros/torso visible y fondo transparente. Cada uno es un **arquetipo propio** (peinado, barba,
anteojos, anteojos de sol, gorra, gorro de lana, trenzas, auriculares, máscara, etc.) en vez de
una simple recombinación de color sobre una única plantilla, sin ningún parecido a personas reales
ni a personajes de franquicias existentes. Nunca mascotas, logos o assets de franquicias/lenguajes/
sistemas operativos reales (regla obligatoria de `CLAUDE.md`). Es un campo **opcional**: si el
participante no elige ninguno, `avatarId` queda en `null` y la UI muestra un ícono neutro genérico
en su lugar.

```ts
const AVATAR_IDS = [
  "afro-pelirrojo-bigote",
  "pelo-largo-lentes-sol-rojo",
  "calvo-barba-canosa-anteojos",
  "rulos-violeta-pecoso",
  "cinta-deportiva-rubio",
  "pelo-corto-pecoso-sonriente",
  "canoso-barba-naranja",
  "anteojos-marco-negro-morocha",
  "mohicano-verde-punk",
  "pelo-corto-oscuro-gorra-lateral",
  "pelirrojo-flequillo",
  "rulos-violeta-suave",
  "trenzas-rubias-cinta",
  "pelirrojo-pecoso-sonriente",
  "canoso-anteojos-sonriente",
  "pelo-negro-lentes-sol-mujer",
  "afro-magenta-anteojos",
  "calvo-barba-tatuajes-cuello",
  "afro-cian-anteojos-rosa",
  "gorra-roja-pecoso",
  "canoso-auriculares-sonriente",
  "rubio-lentes-sol-clasico",
  "pelo-negro-aros-coloridos",
  "afro-magenta-sonriente",
  "calvo-barba-aros-tatuajes",
  "afro-celeste-anteojos-rosados",
  "cresta-celeste-goblin",
  "pelo-rosa-largo-choker",
  "gorra-violeta-pecoso-sonriente",
  "cresta-violeta-sonriente",
  "calvo-barba-collar-tribal",
  "afro-celeste-anteojos-rosa-oscuro",
  "pelo-rosa-choker-mujer",
  "mascara-oscura-ojos-brillantes",
  "afro-violeta-oscuro",
  "gorro-celeste-piel-verde",
  "pelo-castano-aros-coloridos",
  "orco-verde-anteojos-rosa",
  "lentes-sol-negro-barba",
  "anteojos-marco-gris-bigote",
  "trenzas-largas-sonriente",
  "pelo-castano-corto-anteojos-mujer",
  "gorro-lana-canoso-anteojos",
  "lentes-sol-negro-gorra-atras",
  "canoso-anteojos-barba-blanca",
  "lentes-sol-barba-negra",
  "anteojos-marco-gris-sport",
  "trenzas-negras-sonriente",
] as const;

type CardColumn = "keep" | "improve" | "try" | "action_plan";

interface Card {
  id: string;
  column: CardColumn;
  authorId: string;    // Participant.id
  votes: string[];      // array de Participant.id que le dieron su "estrella" a esta tarjeta (evita duplicados)

  // Todas las columnas (keep/improve/try/action_plan): texto libre de la tarjeta/acción concreta.
  // Máximo 512 caracteres (ver "Límite de caracteres").
  text?: string;

  // action_plan además suma responsables (ver back.md sección 5, pregunta resuelta sobre
  // "responsable y fecha de la próxima retro"). La exportación de este plan (PDF/copiar/Notion)
  // queda fuera del MVP — el modelo ya está preparado para eso.
  assigneeIds?: string[];  // Participant.id de los responsables. Vacío o ausente = sin asignar. Incluir el id de TODOS los participantes representa "responsable: todo el equipo".
}
```

**Límite de caracteres:** `text` tiene un máximo de **512 caracteres** (tras aplicar `.trim()`),
igual en todas las columnas. El servidor rechaza `card:add`/`card:edit` con
`error:invalid_action` si lo excede — es el único lugar de verdad, el `maxLength` del
frontend es solo una ayuda de UX, nunca la validación real.

**Visibilidad de tarjetas durante `keep_improve_try` (anti-anclaje):** mientras la fase actual
es `keep_improve_try`, cada participante solo debe ver **sus propias** tarjetas (`authorId ===
mi participantId`) — nunca las de otros. Esto genera intriga y evita que la opinión de quien
escribe primero condicione al resto antes de la puesta en común. Al avanzar de fase (a
`expression_round` en adelante), todas las tarjetas de `keep_improve_try` quedan visibles para
todos, para siempre, durante el resto de la sesión. Ninguna otra fase con tarjetas
(`action_plan`) tiene este filtro — ahí siempre se ve todo en vivo.

Como el servidor sigue siendo la única fuente de verdad, este filtro se aplica **del lado del
servidor**, no en el cliente: durante `keep_improve_try`, `room:state` deja de ser un único
broadcast idéntico para toda la sala (ver sección 3, nota sobre `room:state`) — cada socket
recibe su propia copia de `room.cards` con las tarjetas ajenas de esa fase quitadas. El resto del
estado (`participants`, `phase`, `timer`, etc.) es igual para todos.

```ts

interface RoomState {
  code: string;               // código corto de la sala, ej "RETRO-4X7B"
  hostId: string;             // Participant.id del anfitrión actual
  phase: Phase;
  phaseHistory: Phase[];      // para poder "volver a fase anterior" con contexto
  timer: TimerState;
  participants: Participant[];
  cards: Card[];
  starsPerParticipant: number;  // configurado por el host al crear la sala. Min 1, max 10, default 5.
  currentSpeakerId: string | null; // Participant.id con la palabra durante "expression_round". null en cualquier otra fase o si nadie fue marcado todavía.
  secondsPerSpeaker: number;   // configurado por el host al crear la sala. Min 30, max 300, default 60. Ver "Rotación automática del Nivel 4".
  speakerTimer: SpeakerTimerState | null; // mini-timer del orador actual durante expression_round. null si currentSpeakerId es null.
  previousActionNotes: string; // texto libre opcional que el host pega al crear la sala (ej: acciones concretas de la retro anterior, copiadas a mano del Game Over previo). Se muestra tal cual en el Nivel 2 (previous_action). Máximo 2000 caracteres. No es persistencia real entre sesiones — sigue fuera del MVP (ver back.md sección 5) — es solo texto que viaja en esta sala puntual.
  createdAt: number;          // timestamp epoch ms
}
```

## Rotación automática del Nivel 4 (expression_round)

`expression_round` **no tiene timer de fase** — no está en `TIMED_PHASES`, así que `RoomState.timer`
queda siempre `{status:"idle",...}` durante esta fase (igual que en `waiting_room`/`closing`). No
hay límite total configurable en minutos para este nivel: el host decide cuándo avanzar al
Nivel 5 tocando "Siguiente nivel", sin importar cuántas rotaciones de orador hayan pasado.

En su lugar, cada participante habla un máximo de `secondsPerSpeaker` segundos por turno,
controlado por `speakerTimer`:

- Al marcar un orador (`turn:set_speaker`), el servidor arranca `speakerTimer =
  {status:"running", remainingSeconds: secondsPerSpeaker}` y un loop de tick server-side que
  emite `speaker:tick` cada segundo (igual patrón que `timer:tick`, pero exclusivo de este
  mini-timer).
- Si `speakerTimer.remainingSeconds` llega a 0, el servidor **rota automáticamente** al
  siguiente participante en el orden de `RoomState.participants` (wraparound: después del
  último vuelve al primero), reiniciando `speakerTimer` para esa persona. No requiere ninguna
  acción del host.
- El host puede tocar a **cualquier** participante en cualquier momento (mismo evento
  `turn:set_speaker` que ya existía) para saltar directamente a esa persona, sin esperar a que
  termine el turno actual — esto reinicia `speakerTimer` para el nuevo orador.
- `timer:pause`/`timer:resume` (mismos eventos ya existentes, host-only): mientras `phase ===
  "expression_round"`, pausan/reanudan `speakerTimer.status` en vez de `RoomState.timer` (que no
  aplica a esta fase). Útil si alguien necesita hablar más de lo configurado.
- `timer:add_time`/`-5 min` no tienen efecto en esta fase (no hay timer de fase que extender) —
  el frontend oculta esos controles durante `expression_round`.
- Nuevo evento cliente→servidor `turn:advance` `{}` (host-only): fuerza el paso al siguiente
  participante sin esperar a que `speakerTimer` llegue a 0 — mismo mecanismo interno que usa el
  servidor para la rotación automática, expuesto también al cliente por si se necesita un salto
  manual "al siguiente" sin elegir a alguien puntual.
- Nuevo evento servidor→cliente `speaker:tick` `{remainingSeconds: number}`: emitido cada
  segundo mientras `speakerTimer.status === "running"`, a todos los conectados a la sala.

**Columnas válidas por fase (validación que debe aplicar el backend en `card:add`):**

| Fase | Columnas permitidas |
|---|---|
| `waiting_room`, `welcome`, `previous_action`, `expression_round`, `grouping_voting`, `hall_of_fame`, `closing` | Ninguna — `card:add` siempre rechazado con `error:invalid_action` |
| `keep_improve_try` | `keep`, `improve`, `try` |
| `action_plan` | `action_plan` |

**Nota sobre el Nivel 6 (Salón de la Fama):** no existe un campo separado en `RoomState` para
"el tema a discutir". El top 3 se **deriva** de `cards`, ordenando por `votes.length` de forma
descendente y tomando las primeras tres — tanto el front como el back pueden calcularlo con los
mismos datos que ya reciben en `room:state`, sin necesidad de que el servidor guarde ni transmita
un campo adicional. Esto refleja que el foco de esa fase **emerge de lo que el equipo ya escribió
y votó**, no de algo decidido de antemano por el host.

---

## 2. Eventos: Cliente → Servidor

| Evento | Payload | Quién puede emitirlo | Descripción |
|---|---|---|---|
| `room:create` | `{ hostName: string, starsPerParticipant?: number, secondsPerSpeaker?: number, avatarId?: string, previousActionNotes?: string }` | Cualquiera (se vuelve host) | Crea una sala nueva. `starsPerParticipant` define cuántas estrellas tiene cada participante para repartir en el Nivel 5 (Ranking de estrellas) (mínimo 1, máximo 10). `secondsPerSpeaker` define cuántos segundos habla cada persona en el Nivel 4 antes de rotar (mínimo 30, máximo 300). Si no se envían, el servidor aplica los valores por defecto (`5` y `60` respectivamente). `avatarId` es opcional (ver `AVATAR_IDS` en sección 1); si no se envía o no es válido, queda `null`. `previousActionNotes` es texto libre opcional (máximo 2000 caracteres tras `.trim()`) mostrado en el Nivel 2; si no se envía, queda `""`. El servidor genera `code` y responde con `room:created`. |
| `room:join` | `{ code: string, name: string, avatarId?: string }` | Cualquiera | Une al participante a una sala existente en estado `waiting_room` o ya iniciada. `avatarId` es opcional (ver `AVATAR_IDS` en sección 1); si no se envía o no es válido, queda `null`. |
| `phase:start_session` | `{}` | Solo host | Pasa de `waiting_room` a `welcome`, arranca el flujo. |
| `phase:advance` | `{}` | Solo host | Cierra la fase actual y avanza a la siguiente. |
| `phase:go_back` | `{}` | Solo host | Vuelve a la fase anterior según `phaseHistory`. |
| `timer:pause` | `{}` | Solo host | Pausa el timer de la fase actual. Durante `expression_round`, pausa `speakerTimer` en su lugar (ver "Rotación automática del Nivel 4"). |
| `timer:resume` | `{}` | Solo host | Reanuda un timer pausado. Durante `expression_round`, reanuda `speakerTimer` en su lugar. |
| `timer:add_time` | `{ seconds: number }` | Solo host | Suma (o resta, si `seconds` es negativo) tiempo al timer de la fase actual (ej: +5 min = `300`, -5 min = `-300`). El resultado se clampea a un mínimo de `0` en `remainingSeconds`/`durationSeconds`, nunca queda negativo. Sin efecto durante `expression_round` (no hay timer de fase en ese nivel). |
| `card:add` | `keep`/`improve`/`try`: `{ column: CardColumn, text: string }`. `action_plan`: `{ column: "action_plan", title: string, description?: string, assigneeIds?: string[] }` | Cualquier participante conectado | Agrega una tarjeta nueva a la columna indicada. El shape del payload depende de la columna (ver sección 1) — `action_plan` no usa `text`, usa `title`/`description`/`assigneeIds`. `text`/`title`/`description` tienen un máximo de 512 caracteres (ver "Límite de caracteres"). |
| `card:vote` | `{ cardId: string }` | Cualquier participante conectado | Alterna la estrella propia sobre una tarjeta (asignar/retirar). El servidor rechaza el pedido de **asignar** una nueva estrella si el participante ya usó todas las que tiene disponibles (`starsPerParticipant` menos la cantidad de tarjetas donde ya aparece su `id` en `votes`) — **retirar** una estrella ya asignada siempre está permitido. |
| `card:edit` | `keep`/`improve`/`try`: `{ cardId: string, text: string }`. `action_plan`: `{ cardId: string, title: string, description?: string, assigneeIds?: string[] }` | Solo el `authorId` de esa tarjeta | Edita el contenido de una tarjeta propia. El servidor rechaza con `error:unauthorized` si `authorId !== participantId` del emisor, y con `error:invalid_action` si el contenido no pasa la misma validación que `card:add` (texto/título no vacío, máximo 512 caracteres) o la tarjeta no existe. |
| `card:delete` | `{ cardId: string }` | Solo el `authorId` de esa tarjeta | Elimina una tarjeta propia. Elimina también sus votos (no aplica en `keep_improve_try`/`action_plan`, que no tienen votos, pero es la regla general si en el futuro se vota otra columna). Igual regla de autorización que `card:edit`. |
| `turn:set_speaker` | `{ participantId: string }` | Solo host | Marca a un participante como quien tiene la palabra durante `expression_round` (`currentSpeakerId`), y arranca/reinicia `speakerTimer` a `secondsPerSpeaker` para esa persona. El host puede tocar a cualquier participante en cualquier momento, incluso a mitad del turno de otro, para saltar directamente a esa persona. |
| `turn:clear_speaker` | `{}` | Solo host | Limpia `currentSpeakerId` (nadie resaltado) y pone `speakerTimer` en `null`, por ejemplo entre el final de un turno y el inicio del siguiente. |
| `turn:advance` | `{}` | Solo host | Fuerza el paso al siguiente participante en el orden de `RoomState.participants` (wraparound), sin esperar a que `speakerTimer` llegue a 0 — mismo mecanismo que la rotación automática del servidor, expuesto también al cliente. |
| `room:leave` | `{}` | Cualquiera | Sale de la sala explícitamente. |

**Regla de autorización:** todo evento marcado "Solo host" debe validarse en el servidor
comparando el `socket.id` emisor contra `RoomState.hostId`. Si no coincide, el servidor responde
con `error:unauthorized` y **no** aplica el cambio. Nunca confiar en que el cliente oculte el
botón — la validación real es del lado del servidor.

**Cálculo de estrellas disponibles:** ni el front ni el back necesitan un contador separado en
el estado — las estrellas disponibles de un participante en un momento dado son siempre
`starsPerParticipant - cantidad de cards donde participantId aparece en votes`. Se deriva de los
mismos datos que ya viajan en `room:state`.

---

## 3. Eventos: Servidor → Cliente

| Evento | Payload | Cuándo se emite | A quién |
|---|---|---|---|
| `room:created` | `{ code: string, room: RoomState }` | Al crear la sala exitosamente | Solo al creador |
| `room:state` | `{ room: RoomState }` | Cada vez que cambia cualquier parte del estado (fase, timer, tarjetas, votos, participantes) | A todos los conectados a esa sala. **Excepción:** mientras `phase === "keep_improve_try"`, cada socket recibe una copia de `room` con `cards` filtrado a solo sus propias tarjetas de esa fase (ver sección 1, "Visibilidad de tarjetas durante keep_improve_try") — deja de ser un único payload idéntico para todos en ese momento puntual. |
| `room:not_found` | `{ code: string }` | Si `room:join` usa un código inexistente | Solo a quien lo pidió |
| `timer:tick` | `{ remainingSeconds: number }` | Cada segundo mientras el timer sigue `running` | A todos los conectados a esa sala. **Excepción:** el tick que hace que `remainingSeconds` llegue a `0` (y por lo tanto `timer.status` pasa a `finished`) se emite como `room:state` completo en su lugar, no como `timer:tick` — el cambio de `status` tiene que llegar al cliente para poder mostrar la alarma de fin de timer (ver front.md HU-F16), y `timer:tick` no lleva `status` en su payload. |
| `speaker:tick` | `{ remainingSeconds: number }` | Cada segundo mientras `speakerTimer.status === "running"` (solo durante `expression_round`) | A todos los conectados a esa sala |
| `error:unauthorized` | `{ action: string }` | Si un participante intenta una acción reservada al host | Solo a quien lo intentó |
| `error:invalid_action` | `{ action: string, reason: string }` | Ej: votar una tarjeta que no existe, agregar texto vacío, intentar asignar una estrella sin tener disponibles | Solo a quien lo intentó |
| `participant:disconnected` | `{ participantId: string }` | Cuando alguien pierde conexión | A todos los conectados a esa sala |

**Decisión de diseño:** se emite `room:state` con el estado completo en vez de eventos
granulares por cada micro-cambio (ej: `card:added`, `vote:added` por separado). Para el tamaño de
sala esperado (5-10 personas, pocas tarjetas), esto simplifica mucho el cliente: siempre reemplaza
su estado local con lo último recibido, sin tener que hacer merge de eventos parciales. Si el
proyecto creciera mucho, se podría optimizar a eventos incrementales — no es necesario para el MVP.

**Tope de capacidad (`server_full`):** el servidor acepta como máximo `MAX_CONCURRENT_CONNECTIONS`
(50) sockets simultáneos en todo el proceso (ver back.md HU-B11). Por encima de ese límite, el
intento de conexión se rechaza en el handshake — no como un evento normal de la sala, sino como el
`err.message` del evento `connect_error` estándar de Socket.io en el cliente (`"server_full"`). El
frontend debe distinguir este caso de un corte de red común y no reintentar automáticamente contra
un servidor lleno (ver front.md, estado de conexión `SERVER_FULL`).

---

## 4. Manejo de reconexión

- Si un participante recarga la página (F5) o se desconecta brevemente, el cliente guarda
  `{ code, name, avatarId }` en `sessionStorage` (excepción puntual a la restricción de Storage de
  `front.md` — solo este mínimo, nunca el estado completo de la sala) para reintentar el
  `room:join` automáticamente a la misma sala sin volver a pedirle el nombre a la persona usuaria.
  Se limpia al salir explícitamente de la sala (`room:leave`) o si el servidor responde
  `room:not_found` para ese código.
- La identidad reutiliza el mismo `room:join` de siempre — el servidor la matchea por `name` entre
  los participantes desconectados de esa sala (ver `roomHandlers.js`), no hace falta ningún evento
  nuevo para la reconexión.
- El servidor mantiene al participante en `RoomState.participants` con `connected: false` por un
  tiempo de gracia (sugerido: 5 minutos) antes de removerlo definitivamente, para tolerar cortes
  de red cortos sin perder su nombre ni sus votos previos.
- Si el **host** se desconecta, la sala sigue viva pero sin nadie que pueda avanzar fases hasta
  que reconecte. No se reasigna el rol de host automáticamente en el MVP (posible mejora futura).

## 5. Link de invitación

- Ruta de frontend `/join/:code`: mismo formulario de "Unirse a sala" pero saltea el paso 1
  (código) porque ya viaja en la URL — arranca directo en el paso 2 (nombre + avatar). No agrega
  ningún evento de socket nuevo.
- En "Insertar moneda" (sala de espera), el host y cualquier participante ya unido puede copiar
  este link (`{origin}/join/{code}`) con un botón dedicado, para compartirlo por fuera de la app
  (chat del equipo, etc.) en vez de dictar el código a viva voz.