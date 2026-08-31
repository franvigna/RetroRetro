# back.md — Requerimientos del Backend

Stack: **Node.js + Express + Socket.io**. Estado de cada sala en **memoria del proceso** (no hay
base de datos en esta primera versión — si el servidor se reinicia, se pierden las salas activas,
y esto es un trade-off aceptado, ver `CLAUDE.md`).

El servidor es la **única fuente de verdad** del estado de cada sala. Ningún cliente decide por
sí mismo el resultado de una acción (fase actual, timer, votos) — el servidor valida, aplica el
cambio, y retransmite el estado resultante a todos los conectados a esa sala (evento `room:state`,
ver `shared-contract.md`).

---

## 1. Responsabilidades del servidor

1. Mantener un mapa en memoria de `code → RoomState` (ver estructura en `shared-contract.md`).
2. Generar códigos de sala únicos, cortos y fáciles de comunicar de palabra (ej: evitar
   caracteres ambiguos como `0`/`O`, `1`/`I`).
3. Validar en cada evento entrante que quien lo emite tiene permiso para esa acción (rol host vs
   participante) usando el `socket.id` como identidad, nunca datos que el cliente pueda alterar.
4. Manejar el ciclo de vida del timer de cada sala **en el servidor** (no confiar en un
   `setInterval` del cliente): al iniciar una fase, arrancar una cuenta regresiva server-side y
   emitir `timer:tick` cada segundo a la sala.
5. Manejar reconexiones: si un socket se desconecta, marcar al participante como
   `connected: false` en vez de eliminarlo inmediatamente, y darle una ventana de tiempo (15
   minutos) para reconectar antes de removerlo definitivamente de la sala.
6. Liberar de memoria las salas completamente inactivas (ej: sin ningún participante conectado
   durante más de X tiempo) para no acumular estado infinito en el proceso mientras esté vivo.

---

## 2. Historias de usuario (backend, orientadas a comportamiento del servidor)

**HU-B01 — Creación de sala con código único y configuración de estrellas**
> Como servidor, debo generar un código de sala que no colisione con salas activas existentes, y
> guardar la configuración de estrellas que definió el host, para que cada anfitrión tenga un
> identificador propio y una sesión ajustada a su equipo.
- **Dado** un pedido `room:create` con
  `{ hostName, starsPerParticipant?, secondsPerSpeaker?, previousActionNotes? }`,
- **Cuando** genero el código,
- **Entonces** verifico que no exista ya en el mapa de salas activas antes de asignarlo.
- **Y** valido `starsPerParticipant`: si no viene, uso `5` por defecto; si viene, debe ser un
  entero entre `1` y `10` inclusive.
- **Y si** `starsPerParticipant` viene fuera de ese rango, respondo `error:invalid_action` y no
  creo la sala.
- **Y** valido `secondsPerSpeaker`: si no viene, uso `60` por defecto; si viene, debe ser un
  entero entre `30` y `300` inclusive (ver HU-B07, rotación automática del Nivel 4).
- **Y si** `secondsPerSpeaker` viene fuera de ese rango, respondo `error:invalid_action` y no creo
  la sala.
- **Y** valido `previousActionNotes`: si no viene, uso `""` por defecto; si viene, lo recorto
  (`.trim()`) y rechazo con `error:invalid_action` si supera los 2000 caracteres. Es texto libre
  sin ninguna otra validación de formato — el host lo pega tal cual (ej: copiado del Game Over de
  la retro anterior) para que se muestre en el Nivel 2 (ver HU-F16b en front.md).

**HU-B01b — Validación de `avatarId` opcional (room:create y room:join)**
> Como servidor, debo validar el `avatarId` que envía un participante al crear o unirse a una
> sala, para que solo se usen los personajes pixel-art originales del set fijo de la app y nunca
> un valor arbitrario.
- **Dado** un pedido `room:create` o `room:join` con `avatarId` opcional,
- **Cuando** `avatarId` no viene o es `undefined`,
- **Entonces** guardo `avatarId: null` en el `Participant` correspondiente.
- **Y cuando** `avatarId` viene pero no está en el set fijo `AVATAR_IDS` (ver
  `shared-contract.md` sección 1),
- **Entonces** también guardo `avatarId: null` (no rechazo la creación/unión por esto, es un
  campo puramente cosmético y opcional).
- **Y cuando** `avatarId` viene y es un valor válido de `AVATAR_IDS`,
- **Entonces** lo guardo tal cual en el `Participant`.

**HU-B02 — Autorización de acciones exclusivas del host**
> Como servidor, debo rechazar cualquier evento reservado a host si no proviene del socket
> registrado como `hostId` de esa sala, para evitar que un participante controle la sesión.
- **Dado** un evento como `phase:advance`, `timer:pause`, `timer:add_time`, etc.,
- **Cuando** el `socket.id` emisor no coincide con `RoomState.hostId`,
- **Entonces** respondo `error:unauthorized` al emisor y **no** modifico el estado de la sala.

**HU-B02b — Reconexión autenticada por sessionToken, sala cerrada a gente nueva tras el inicio**
> Como servidor, debo autenticar cada reconexión con un secreto propio de cada participante (no
> con el nombre, que cualquiera puede repetir), y dejar de aceptar participantes nuevos una vez
> que la partida arrancó, para que nadie pueda entrar como otra persona (el host incluido) ni
> sumarse a mitad de la retro sin haber estado en las fases anteriores.
- **Dado** un `room:create` o un `room:join` que da de alta a un participante nuevo,
- **Entonces** genero un `sessionToken` random para ese participante (ver `generateSessionToken` en
  `domain/room.js`) y se lo entrego en privado, aparte de `RoomState` (`room:created`/`room:joined`
  — nunca dentro de `RoomState.participants`, ver `toPublicRoom` y `shared-contract.md` sección 1).
- **Dado** un evento `room:join` con un `sessionToken`,
- **Cuando** ese token coincide con el de un participante existente de esa sala,
- **Entonces** reconecto a esa identidad (mismo `id`, `role`, `avatarId`) y **ignoro** el `name` que
  venga en el pedido — el token es la única credencial que importa.
- **Dado** un evento `room:join` sin `sessionToken`, o con uno que no matchea a nadie,
- **Cuando** `RoomState.phase` es `waiting_room`,
- **Entonces** doy de alta a un participante nuevo, como siempre (ver HU-B01b para `avatarId`).
- **Y cuando** `RoomState.phase` ya no es `waiting_room`,
- **Entonces** respondo `room:join_locked` y no doy de alta a nadie.
- **Nota:** antes de esta HU, la reconexión matcheaba por `name === name` entre los participantes
  desconectados — cualquiera podía reconectarse como otro (incluido el host) con solo escribir su
  nombre exacto mientras esa persona estaba offline. Quedó cerrado.

**HU-B03 — Transición de fases con historial**
> Como servidor, debo llevar un registro de las fases por las que ya pasó la sala, para poder
> resolver correctamente un pedido de "volver a fase anterior".
- **Dado** que la sala está en la fase `keep_improve_try` y ya pasó por `welcome` y
  `previous_action`,
- **Cuando** el host pide `phase:go_back`,
- **Entonces** la sala vuelve a `previous_action`, y el timer de esa fase se reinicia con su
  duración configurada (a definir si se retoma con tiempo restante o se reinicia — dejar como
  pregunta abierta a resolver en fase de plan, ver sección 5).

**HU-B04 — Timer autoritativo del servidor**
> Como servidor, debo ser quien controla el conteo del timer de cada fase, para que todos los
> participantes vean exactamente el mismo tiempo restante sin importar su propia latencia de red.
- **Dado** que una fase con timer arranca,
- **Cuando** pasa cada segundo real,
- **Entonces** emito `timer:tick` con el `remainingSeconds` actualizado a todos los conectados de
  esa sala, y si llega a 0, marco el timer como `finished` sin avanzar automáticamente de fase
  (el avance sigue siendo una decisión manual del host).
- **Nota (frontend):** `timer.status === "finished"` es la señal que usa el cliente para mostrar
  el aviso de alarma con opciones "+5 min"/"Continuar" — ver `front.md` HU-F16. El servidor no
  necesita ningún campo nuevo para esto, ya alcanza con el `status` existente.

**HU-B12 — Restar tiempo del timer de fase (-5 min)**
> Como servidor, debo permitir que el host también reste tiempo al timer de la fase actual (no
> solo sumar), para poder acortar una fase que se estiró de más, sin dejar el timer en un estado
> inválido.
- **Dado** un evento `timer:add_time` con `{ seconds }`,
- **Cuando** `seconds` es negativo (restar tiempo),
- **Entonces** aplico la resta igual que hoy aplico la suma, pero clampeando el resultado: tanto
  `remainingSeconds` como `durationSeconds` nunca bajan de `0`.
- **Y si** el resultado clampeado no cambia nada (el timer ya estaba en `0`),
- **Entonces** igual acepto la operación sin error (es un no-op válido, no hay motivo de negocio
  para rechazarla).
- **`timer:add_time` también es válido con el timer en `finished`** — es justamente el caso de uso
  del botón "+5 min" del aviso de alarma (HU-B04/HU-F16): sumar segundos con el timer en `finished`
  y un resultado > 0 lo reactiva a `running` (retoma el conteo); restar (o sumar 0 neto) lo deja en
  `finished` con `remainingSeconds` en 0.
- **Sin efecto durante `expression_round`** — esa fase no tiene `RoomState.timer` relevante (ver
  HU-B07), el frontend oculta los controles +5min/-5min en ese nivel.

**HU-B05 — Alta de tarjetas con validación**
> Como servidor, debo validar el contenido de una tarjeta y una columna válida para la fase
> actual antes de aceptarla, para mantener consistencia en los datos de la sala.
- **Dado** un evento `card:add` para columna `keep`/`improve`/`try`,
- **Cuando** `text` está vacío, supera los 512 caracteres (tras `.trim()`), o la columna no
  corresponde a la fase actual,
- **Entonces** respondo `error:invalid_action` con el motivo, sin agregar la tarjeta.
- **Dado** un evento `card:add` para columna `action_plan`,
- **Cuando** `text` está vacío o supera los 512 caracteres, o la fase actual no es `action_plan`,
- **Entonces** respondo `error:invalid_action` con el motivo, sin agregar la tarjeta.
- **Y** `assigneeIds` es opcional: si viene, cada id debe existir en `RoomState.participants`
  (cualquier id que no exista se rechaza con `error:invalid_action`).

**HU-B05b — Visibilidad filtrada de tarjetas propias durante keep_improve_try**
> Como servidor, debo ocultarle a cada participante las tarjetas ajenas mientras la fase
> `keep_improve_try` sigue activa, para que nadie condicione su aporte viendo lo que ya escribió
> otro, y recién revelar todo junto cuando el equipo avanza a debatirlo.
- **Dado** que `RoomState.phase === "keep_improve_try"`,
- **Cuando** emito `room:state` a la sala,
- **Entonces**, en vez de un único broadcast idéntico para todos (`io.to(code).emit`), itero cada
  socket conectado a esa sala y le mando su propia copia de `room` con `cards` filtrado a
  `card.authorId === ese participantId` (para las columnas `keep`/`improve`/`try` — las demás
  columnas no aplican en esta fase).
- **Y cuando** `RoomState.phase` es cualquier otra fase,
- **Entonces** `room:state` vuelve a ser el broadcast único sin filtrar de siempre — todas las
  tarjetas de `keep_improve_try` quedan visibles para todos de ahí en adelante (el filtro es
  puntual a esa fase, no borra ni oculta datos permanentemente).

**HU-B05c — Edición y eliminación de tarjeta propia**
> Como servidor, debo permitir que el autor de una tarjeta la edite o elimine, y rechazar el
> intento de cualquier otra persona (incluido el host), para que cada quien controle únicamente
> lo que escribió.
- **Dado** un evento `card:edit` o `card:delete` con un `cardId` existente,
- **Cuando** `card.authorId !== participantId` del emisor,
- **Entonces** respondo `error:unauthorized` y no modifico la tarjeta.
- **Dado** un `card:edit` del propio autor,
- **Cuando** el nuevo contenido no pasa la misma validación que `card:add` (texto/título vacío o
  mayor a 512 caracteres),
- **Entonces** respondo `error:invalid_action` y no aplico el cambio.
- **Dado** un `card:delete` del propio autor con `cardId` válido,
- **Cuando** se procesa,
- **Entonces** remuevo la tarjeta de `RoomState.cards` por completo.

**HU-B06 — Estrellas limitadas sin duplicados (toggle con tope)**
> Como servidor, debo permitir que cada participante asigne como máximo `starsPerParticipant`
> estrellas en total (repartidas entre distintas tarjetas, nunca más de una por tarjeta), y que
> repetir la acción sobre una tarjeta ya marcada retire esa estrella, para que el conteo sea
> siempre confiable y respete el límite configurado por el host.
- **Dado** un evento `card:vote` con un `cardId` existente,
- **Cuando** el `participantId` ya está en `votes` de esa tarjeta,
- **Entonces** lo remuevo (retira la estrella) — esta acción **siempre** está permitida, sin
  importar el límite.
- **Cuando** el `participantId` no está en `votes` de esa tarjeta,
- **Y** la cantidad de tarjetas donde ya aparece ese `participantId` es menor a
  `starsPerParticipant`,
- **Entonces** lo agrego (asigna la estrella).
- **Y si** el participante ya alcanzó su límite de `starsPerParticipant` estrellas asignadas en
  otras tarjetas,
- **Entonces** respondo `error:invalid_action` (sin estrellas disponibles) y no modifico
  `votes`.

**HU-B07 — Marcar quién tiene la palabra, con rotación automática por tiempo (Turno de jugador)**
> Como servidor, debo permitir que solo el host marque o limpie quién tiene la palabra durante
> `expression_round`, y además hacer rotar automáticamente el turno cada `secondsPerSpeaker`
> segundos, para que la ronda de expresión avance sola sin que el host tenga que estar pendiente
> de cronometrar a cada persona.
- **Dado** un evento `turn:set_speaker` con `{ participantId }`,
- **Cuando** el emisor no es el `hostId` de la sala,
- **Entonces** respondo `error:unauthorized` y no modifico `currentSpeakerId` ni `speakerTimer`.
- **Cuando** el emisor sí es el host y `participantId` corresponde a alguien presente en
  `participants`,
- **Entonces** actualizo `currentSpeakerId` a ese valor, reinicio `speakerTimer` a
  `{status:"running", remainingSeconds: secondsPerSpeaker}`, arranco (o reinicio) el loop de tick
  de ese mini-timer, y lo reflejo en `room:state`. Esto vale tanto para marcar a alguien por
  primera vez como para saltar a mitad del turno de otro — el host puede tocar a cualquiera en
  cualquier momento.
- **Y si** `participantId` no existe en `participants`,
- **Entonces** respondo `error:invalid_action` sin modificar el estado.
- **Dado** un evento `turn:clear_speaker` del host,
- **Cuando** lo proceso,
- **Entonces** seteo `currentSpeakerId` a `null`, `speakerTimer` a `null`, detengo el loop de tick
  del mini-timer, y lo reflejo en `room:state`.
- **Dado** que `speakerTimer.remainingSeconds` llega a `0` (vía el loop de tick del servidor),
- **Cuando** ocurre,
- **Entonces** roto automáticamente `currentSpeakerId` al siguiente participante en el orden de
  `RoomState.participants` (índice siguiente, con wraparound: después del último vuelve al
  primero), reinicio `speakerTimer` para esa persona, y emito `room:state` — sin ninguna acción
  del host.
- **Dado** un evento `turn:advance` del host,
- **Cuando** el emisor no es el `hostId`,
- **Entonces** respondo `error:unauthorized`.
- **Cuando** el emisor sí es el host,
- **Entonces** aplico la misma rotación al siguiente participante que dispara el mini-timer al
  llegar a 0 (útil para saltar de turno sin esperar ni elegir a alguien puntual).
- **Dado** `timer:pause`/`timer:resume` del host mientras `phase === "expression_round"`,
- **Cuando** los proceso,
- **Entonces** pauso/reanudo `speakerTimer.status` (en vez de `RoomState.timer`, que no aplica a
  esta fase) — útil si alguien necesita más tiempo que `secondsPerSpeaker`.
- **Nota:** `expression_round` no tiene timer de fase (no está en `TIMED_PHASES`), así que
  `RoomState.timer` permanece siempre `idle` durante esta fase — no hay límite total configurable,
  el host decide cuándo avanzar al Nivel 5 con `phase:advance` normal, sin importar cuántas
  rotaciones de orador hayan pasado.

**HU-B08 — Cálculo del Top 3 para el Salón de la Fama**
> Como servidor, no necesito guardar ni calcular explícitamente el Top 3 del Nivel 6, ya que se
> deriva de datos que ya existen en el estado, para no duplicar lógica de negocio entre back y
> front.
- El servidor no expone un campo nuevo para esto — tanto el front como cualquier test de backend
  pueden obtener el Top 3 ordenando el array `cards` (de cualquier `RoomState`) por
  `votes.length` de forma descendente y tomando los primeros 3 elementos.
- **Desempate (resuelto, ver sección 5):** si dos o más tarjetas empatan en la cantidad de
  estrellas que definiría el 3er puesto, se incluyen **todas** las tarjetas empatadas en ese
  puesto — el resultado puede tener más de 3 elementos. Ej: 1ro (5★), 2do (4★), y dos tarjetas
  empatadas en 3ro (3★ cada una) → se muestran las 4.

**HU-B09 — Manejo de desconexión temporal**
> Como servidor, debo mantener al participante en la sala con `connected: false` ante una
> desconexión, dándole una ventana de gracia para volver, para no perder su historial de
> estrellas asignadas o su lugar en la sesión por un corte de red momentáneo.
- **Nota:** si el participante desconectado era `currentSpeakerId` en el momento del corte, ese
  valor se mantiene tal cual (no se limpia automáticamente) — es el host quien decide si lo
  cambia manualmente al notar la desconexión.
- **Ver HU-B02b** para cómo se autentica la reconexión dentro de esta ventana (por `sessionToken`,
  no por nombre) y por qué eso sigue funcionando aunque la sala ya haya arrancado.

**HU-B10 — Limpieza de salas inactivas**
> Como servidor, debo liberar de memoria las salas sin participantes conectados tras un tiempo
> prolongado, para no degradar el desempeño del proceso a lo largo del tiempo.

**HU-B11 — Tope global de conexiones simultáneas**
> Como servidor, debo rechazar conexiones nuevas por encima de un límite fijo de sockets activos
> en todo el proceso, para no arriesgar el uso de CPU/memoria del plan gratuito de Render ante un
> pico de tráfico inesperado (no es protección contra un ataque dirigido, es un techo básico de
> capacidad — ver `infra.md`).
- **Dado** que ya hay `MAX_CONCURRENT_CONNECTIONS` (50) sockets conectados al proceso,
- **Cuando** llega un intento de conexión nuevo,
- **Entonces** el servidor lo rechaza en el handshake (middleware de Socket.io, antes de
  `connection`) con un error `server_full`, sin crear ni tocar ningún `RoomState`.
- **Y cuando** hay lugar disponible (algún socket se desconectó, bajando el conteo),
- **Entonces** las conexiones nuevas se aceptan normalmente.
- El conteo es sobre conexiones de socket activas en el proceso, no sobre salas ni participantes
  "connected: true" — un mismo proceso puede tener muchas salas chicas o pocas salas grandes, el
  límite es agnóstico a cómo se reparten.

---

## 3. Endpoints REST (mínimos, si se necesitan fuera de los eventos de socket)

Para el MVP, la intención es resolver **todo** el flujo funcional vía eventos de Socket.io (ver
`shared-contract.md`), no vía REST. El único endpoint HTTP necesario es:

- `GET /health` → responde `200 OK` con un JSON simple (`{ status: "ok" }`). Sirve para que
  servicios externos (o el propio anfitrión, manualmente) puedan "despertar" el backend de Render
  antes de una sesión, sin depender de abrir la app completa. Ver `infra.md`.

Si durante el desarrollo aparece la necesidad de algún otro endpoint REST, se debe agregar acá
antes de implementarlo, no directamente en el código.

---

## 4. Testing requerido — Backend

### 4.1 Pruebas unitarias (ej: Vitest o Jest, sin necesidad de sockets reales)

- Generación de código de sala: nunca genera un código duplicado si ya existe uno igual en el
  mapa de salas activas (mockear el mapa con una colisión forzada y verificar reintento).
- Lógica de autorización: dado un `RoomState` con un `hostId` definido, un evento de un
  `socket.id` distinto es rechazado; el mismo evento del `hostId` correcto es aceptado.
- Lógica de transición de fases: dado un `phaseHistory`, `phase:advance` y `phase:go_back`
  producen la fase esperada en cada caso, incluyendo el caso borde de intentar `go_back` desde la
  primera fase real (después de `waiting_room`).
- Lógica del timer: dado un estado `running` con `remainingSeconds = 1`, al pasar un tick más el
  estado pasa a `finished` sin quedar en negativo.
- Lógica de `timer:add_time`: sumar segundos a un timer `running` y a uno `paused` (definir y
  testear el comportamiento esperado en ambos casos).
- Validación de tarjetas: texto vacío o columna inválida para la fase actual son rechazados;
  texto y columna válidos son aceptados.
- Lógica de estrellas con tope: asignar una estrella cuando el participante está por debajo de
  `starsPerParticipant` la agrega; retirarla siempre funciona sin importar el límite; intentar
  asignar una nueva estrella habiendo alcanzado el tope devuelve el error correspondiente sin
  modificar `votes`; votar una tarjeta inexistente devuelve el error correspondiente sin lanzar
  una excepción no controlada.
- Cálculo del Top 3: dado un array de tarjetas de ejemplo con distintas cantidades de estrellas,
  la función que deriva el Top 3 devuelve las 3 con más `votes.length`, ordenadas de mayor a
  menor, y maneja el caso de empate según el criterio que se defina en la etapa de plan.
- Validación de `starsPerParticipant` al crear sala: valores fuera de 1-10 son rechazados; sin
  valor, se aplica el default de 5; valores dentro del rango se guardan tal cual.
- Validación de `previousActionNotes` al crear sala: sin valor, se guarda `""`; con valor, se
  recorta (`.trim()`) y se guarda tal cual si no supera los 2000 caracteres; se rechaza con
  `error:invalid_action` si los supera.
- Lógica de `turn:set_speaker`/`turn:clear_speaker`: un evento de un socket que no es el host es
  rechazado con `error:unauthorized` y no modifica `currentSpeakerId`; el mismo evento del host
  con un `participantId` válido sí lo actualiza; un `participantId` inexistente devuelve
  `error:invalid_action` sin modificar el estado; `turn:clear_speaker` del host siempre resetea
  `currentSpeakerId` a `null`.
- Limpieza de salas: dado un estado simulado de "última actividad" viejo, la sala se marca para
  liberar; si tiene participantes conectados, no se libera aunque el tiempo haya pasado.

### 4.2 Pruebas de integración / end-to-end del servidor (ej: con un cliente real de
`socket.io-client` en el test, contra una instancia del servidor levantada en memoria)

- **E2E-B01:** al emitir `room:create`, se recibe `room:created` con un código válido y el
  emisor queda como `hostId` en el estado devuelto.
- **E2E-B02:** un segundo cliente que emite `room:join` con ese código recibe el `room:state`
  actualizado, y el primer cliente (host) también lo recibe reflejando al nuevo participante.
- **E2E-B03:** un cliente no-host que emite `phase:advance` recibe `error:unauthorized` y el
  estado de la sala no cambia para nadie.
- **E2E-B04:** el host emitiendo `phase:advance` sí produce un `room:state` actualizado para
  todos los conectados a esa sala.
- **E2E-B05:** durante una fase con timer activo, todos los clientes conectados reciben
  `timer:tick` con el mismo `remainingSeconds` en cada segundo.
- **E2E-B06:** dos clientes en la misma sala, uno le asigna una estrella a una tarjeta del otro
  y ambos reciben el `room:state` con la estrella reflejada; el mismo cliente vuelve a tocar la
  misma tarjeta y la estrella se retira para ambos.
- **E2E-B06b:** un cliente con `starsPerParticipant = 1` asigna su única estrella a una tarjeta,
  luego intenta asignarla a otra tarjeta distinta — el segundo intento no tiene efecto en el
  estado de la sala, y solo la primera tarjeta queda con su estrella.
- **E2E-B06c:** el host emite `turn:set_speaker` con el `participantId` de un participante
  conectado — todos los clientes de la sala reciben `room:state` con `currentSpeakerId`
  actualizado. Un cliente no-host que intenta emitir el mismo evento recibe `error:unauthorized`
  y el estado no cambia.
- **E2E-B07:** un cliente se desconecta (simulando corte de socket) y reconecta con el mismo
  `code` dentro de la ventana de gracia — su voto previo y su nombre siguen presentes en el
  estado de la sala.
- **E2E-B08:** `room:join` con un código inexistente responde `room:not_found` sin crear ningún
  estado nuevo.

---

## 5. Preguntas resueltas

- **`phase:go_back` y el timer:** reinicia a la duración completa configurada de la fase a la
  que se vuelve, no retoma el tiempo restante previo.
- **Duración por defecto de cada fase:** configurable por el host al crear la sala (ver
  `phaseDurations` en `shared-contract.md`), con valores recomendados prellenados.
- **Top 3 del Nivel 6 (Salón de la Fama) — desempate:** si hay empate en el límite del 3er
  puesto, se muestran **todas** las tarjetas empatadas (puede haber más de 3 en pantalla). No se
  descarta arbitrariamente ninguna tarjeta que recibió el mismo apoyo que otra.
- **Nivel 6 (Salón de la Fama) — sin tema de antemano:** nunca requiere que el host defina un
  tema al crear la sala. El foco de esa fase **emerge** de lo que el equipo escribió y votó
  durante la propia sesión (Top 3 por cantidad de estrellas), calculado automáticamente. Lo único
  configurable por el host es la cantidad de estrellas por participante (`starsPerParticipant`).
- **"Responsable y fecha de la próxima retro" (Cierre):** se resuelve como **(a)** — cada tarjeta
  de `action_plan` tiene su propio `text` (la acción concreta) y `assigneeIds` opcional (array de
  `Participant.id`; puede ser una persona, varias, o todo el equipo listando a todos los ids). No
  hay un campo `dueDate` explícito ni un dato separado de "próxima sesión" a nivel
  de sala — el "para revisar en la próxima retro" se resuelve simplemente porque el plan de
  acción queda visible en pantalla en "Game Over" durante esa sesión.
- **Continuidad manual entre retros distintas (Nivel 2):** no hay persistencia real entre salas
  (fuera del MVP, sigue sin haber base de datos). La continuidad se resuelve con
  `previousActionNotes`: texto libre que el host pega a mano al crear la sala (por ejemplo,
  copiado del "PLAN DE ACCIÓN CONSOLIDADO" del Game Over de la retro anterior), guardado tal cual
  en esta sala puntual y mostrado en el Nivel 2. No es una exportación ni un vínculo real entre
  sesiones — es la forma más simple de no perder el hilo sin sumar scope de persistencia.