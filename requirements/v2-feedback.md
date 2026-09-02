# v2-feedback.md — Requisitos v2 a partir del alpha test de Jaliscom

**Origen:** primera sesión real de RetroRetro, facilitada con el equipo Jaliscom como alpha
testers. Después de la sesión, Cisco pidió feedback abierto (qué falta, qué fue incómodo/lento/
poco claro, qué mejorarían) y el equipo respondió en un hilo de chat. Este documento traduce ese
feedback crudo en requisitos organizados, tomando como base la implementación ya documentada en
`front.md`, `back.md` y `shared-contract.md`.

**Cómo leer este documento:** es **input para planificación**, no la fuente de verdad final —
cuando una sección de acá se apruebe e implemente, el detalle correspondiente pasa a vivir en
`front.md`/`back.md`/`shared-contract.md` como cualquier otro requisito, y este documento queda
como historial de por qué se tomó esa decisión. Cada punto está etiquetado:

- 🐞 **Bug** — algo que el spec actual ya resuelve en teoría, pero falló en la sesión real.
- 🔧 **Mejora** — ajuste a una mecánica que ya existe.
- ✨ **Nuevo** — funcionalidad que no existe hoy.
- ✅ **Confirmado** — feedback positivo sobre algo que ya existe; no requiere cambios.

Dos hilos conductores del feedback, que se repiten en varios puntos: (1) el **timing de la Ronda
de expresión** no se sintió bien ajustado, y (2) varias piezas de la app están **hardcodeadas a
Jaliscom** en vez de ser genéricas — lo cual choca directo con el objetivo de fondo de que la
herramienta sirva como marco de referencia para otros equipos.

---

## 1. 🐞 Bug — Participantes con el mismo nombre rompen el flujo de unión

> Francisco: "arreglar el tema que le pasó a Agus que había doble Agustín y tuvimos que volver
> para atrás para que se pueda conectar"

Dos participantes distintos compartiendo primer nombre ("Agustín") hicieron fallar el ingreso de
uno de los dos, obligando a retroceder en el flujo de "Unirse a sala" como workaround manual.

Esto es relevante porque el modelo de datos actual (`Participant.id` = `socket.id`,
autenticación de reconexión por `sessionToken` — ver `back.md` HU-B02b) **ya está diseñado** para
no depender del nombre como identificador único. Un nombre duplicado nunca debería poder romper
el alta de un participante nuevo — si pasó, hay una ruta de código (alta, reconexión, o alguna
pieza de UI) que todavía compara por `name` en vez de por `id`/`sessionToken`.

**HU-V2-01 — Soportar nombres de participante duplicados sin fallas**
- **Dado** que un participante con nombre "Agustín" ya está conectado a una sala,
- **Cuando** otro participante nuevo elige unirse con el mismo nombre "Agustín" (persona distinta,
  sin `sessionToken` guardado),
- **Entonces** el alta se completa con normalidad, generando un `Participant.id`/`sessionToken`
  propio e independiente del primero — el nombre repetido nunca es motivo de rechazo ni de error.
- **Y** en toda la UI donde se lista a participantes (sala de espera, Nivel 4 — quién tiene la
  palabra, desplegable de responsables del Nivel 7), ambos "Agustín" se distinguen visualmente sin
  ambigüedad — por ejemplo por su personaje (`avatarId`) además del nombre, no solo por texto.

**Tarea de investigación antes de definir el fix exacto:** revisar el código real (no solo el
spec) buscando cualquier comparación de identidad por `name` — especialmente en el flujo de alta
de `room:join` cuando `RoomState.phase === "waiting_room"` (HU-B02b) y en cualquier lógica
client-side de resolución de "quién soy yo" tras un refresh. El spec ya dice que la única
credencial válida es `sessionToken`; el bug indica que en algún punto no se está respetando eso.

---

## 2. 🔧 Ronda de expresión (Nivel 4) — el tiempo fijo por orador no encajó

> "el tiempo era bastante limitado, a Mili le apareció que seguía [ella] como 5 veces" · "capaz
> puedo poner que el tiempo dependa de la cantidad de cards que escriba cada uno" · "debería ser
> dinámico, mientras más cards escribís más tiempo tenés, o un tiempo fijo por card"

Hoy `secondsPerSpeaker` (HU-B01, HU-B07) es un único valor fijo (30–300s, default 90s) igual para
todos los participantes, sin relación con cuántas tarjetas escribió cada uno. En la sesión real
esto generó fricción: alguien con varias tarjetas para comentar se quedaba corto de tiempo y el
turno rotaba automáticamente antes de terminar, obligando al host a volver a marcarlo como orador
repetidas veces.

**Nota de Cisco (propuesta inicial, no decisión tomada):** tiempo fijo *por tarjeta* escrita —
ej. 45 segundos por card, así alguien con 3 cards tiene 2:15 y alguien con 6 cards tiene 4:30.

**HU-V2-02 — Tiempo de orador proporcional a la cantidad de tarjetas propias**
- **Dado** que la sala entra a `expression_round` (Nivel 4),
- **Cuando** el host marca a un participante como orador (`turn:set_speaker`),
- **Entonces** `speakerTimer` arranca con un tiempo calculado en base a la cantidad de tarjetas de
  `keep`/`improve`/`try` de las que ese participante es `authorId`, en vez de un valor fijo global
  igual para todos.
- **Fórmula propuesta:** `remainingSeconds = secondsPerCard × cantidadDeCardsDelParticipante`,
  con un piso mínimo para quien escribió 0 tarjetas (para no dejarlo con 0 segundos si igual quiere
  hablar).

**Preguntas abiertas para definir esta HU antes de implementarla** (ver también sección 8):
- ¿`secondsPerCard` reemplaza a `secondsPerSpeaker` en la configuración de sala, o el host elige
  entre "tiempo fijo" y "tiempo por card" al crear la sala (dos modos, no uno solo)? El feedback
  del equipo menciona ambas variantes ("que dependa de la cantidad" vs "un tiempo fijo por card"),
  que en rigor son la misma mecánica descripta con otras palabras — pero conviene confirmar que no
  se está pidiendo además la opción de mantener un tiempo *totalmente* uniforme como hoy.
- ¿Cuál es el piso mínimo para alguien con 0 tarjetas?
- Si alguien edita o borra una tarjeta propia (HU-F09c) **durante** su propio turno, ¿el tiempo ya
  asignado se recalcula en caliente o se mantiene el valor con el que arrancó el turno?
- ¿Qué pasa si el host salta a esa persona una segunda vez en la misma sesión (turno interrumpido y
  retomado más tarde) — vuelve a recibir el tiempo completo, o solo lo que le quedaba?

---

## 3. ✨ Ambientación sonora — más allá de la alarma del timer

> "si le agregás un soundtrack quedaría de 10" · Juan Pablo: "en la etapa de completar las cards
> poner musiquita de mientras" · respuesta de Cisco: "había puesto sonido para el timer nomás, que
> avisa cuando se termina el tiempo del nivel"

Hoy el único sonido de la app es la alarma de fin de timer (`timer.status === "finished"`, ver
`back.md` HU-B04 y `front.md` HU-F16). El pedido es distinto: **música ambiente de fondo** durante
las fases donde se está escribiendo (al menos el Nivel 3, posiblemente también mientras se
reparten estrellas o se arma el plan de acción), como refuerzo de la temática arcade.

**HU-V2-03 — Música ambiente opcional durante fases de escritura**
- **Dado** que la sala está en una fase con tarjetas activas (al menos `keep_improve_try`),
- **Entonces** se reproduce un loop de música ambiente original (nunca una pista con copyright de
  terceros — misma regla de assets 100% propios de `CLAUDE.md`/`front.md` sección 5).
- **Y** existe un control de silenciar/reactivar visible para cada usuario individualmente (la
  música es una preferencia personal, no algo que el host deba controlar para todos) — separado
  del control existente de alarma del timer.
- **Y** respeta las políticas de autoplay del navegador: arranca recién tras una interacción del
  usuario (ej. el botón de "Iniciar partida" o el primer toque en la sala), nunca intenta
  reproducir sonido sin gesto previo.

**Pregunta abierta:** ¿la música ambiente suena en todas las fases con contenido (Nivel 3, 5, 7) o
solo durante el Nivel 3 como pidió Juan Pablo puntualmente? El pedido explícito fue solo sobre la
fase de escribir tarjetas.

---

## 4. ✨ Personajes genéricos — hoy están hardcodeados a Jaliscom (bloqueante para portabilidad)

> Francisco: "ver el tema de los personajes porque asumo que ahora están fijos y deberían ser
> genéricos"

Esto no es una percepción — está confirmado en `shared-contract.md`: el set fijo de `AVATAR_IDS`
es literalmente `["cisco", "licha", "juampy", "mili", "agus", "sergio"]`, generado con la
herramienta interna "Avatar Lab" a partir de **fotos reales de los integrantes de Jaliscom**. Todo
equipo nuevo que use la app vería, en la pantalla de selección de personaje, las caras de gente de
otro equipo — inutilizable fuera de Jaliscom tal cual está hoy.

Este punto es **directamente bloqueante** para el objetivo de fondo del proyecto ("que la
herramienta no quede limitada a Jaliscom"), no una mejora cosmética opcional.

**HU-V2-04 — Set de personajes genérico y original**
- El set `AVATAR_IDS` pasa a ser un elenco de personajes pixel-art **diseñados desde cero**, sin
  relación con ninguna persona real ni de Jaliscom ni de ningún otro equipo — mismo criterio de
  "arte 100% original" que ya rige para el resto de los assets del proyecto.
- La mecánica de selección (HU-F07: grilla obligatoria, tocar para elegir/deseleccionar) no
  cambia — solo cambia el contenido del set.
- El nombre interno de cada `avatarId` deja de ser el nombre de una persona (`"agus"`, `"mili"`)
  y pasa a ser un id neutro (ej. `"avatar-01"` o un nombre de personaje ficticio propio).

**Pregunta abierta:** ¿alcanza con reemplazar el set actual por otro set fijo pero genérico (misma
complejidad que hoy, solo con arte nuevo), o el objetivo de portabilidad amerita ir más lejos y
permitir que cada equipo/sala tenga su propio set de personajes (conecta con el punto 5,
temáticas)? Para v2 alcanzaría con lo primero; lo segundo es un cambio de arquitectura mayor y no
debería asumirse sin discutirlo aparte.

---

## 5. ✨ Temáticas de tarjetas configurables (mejora, no bloqueante)

> "no hubo quizá temática como hemos hecho de superhéroes o memes, eso podría ser puntual del
> equipo, si se quiere trasladar para mí debería incluir lo mínimo indispensable y considero que
> estuvo" · Francisco: "me gustó la idea de diferentes temáticas"

A diferencia del punto 4, acá el propio equipo aclara que la ausencia de temática **no fue un
problema** para esta sesión — el arcade genérico "lo mínimo indispensable" ya alcanzó. Es Francisco
quien agrega, por separado, que le gustaría la idea de poder tener temáticas distintas a futuro.

Interpretación: esto es una mejora de personalización por sala/equipo (ej. reskins visuales o de
copy sobre la misma mecánica Keep/Improve/Try), útil para la portabilidad a otros equipos que sí
quieran su propia identidad — pero **no** es un gap que haya afectado la sesión real, a diferencia
de los puntos 1, 2 y 4.

**HU-V2-05 — Temática de sala seleccionable (propuesta, sin definir alcance todavía)**
- El host podría elegir, al crear la sala, una temática visual/de copy entre un set de opciones
  (manteniendo siempre la estética "arcade retro" base, nunca contenido de franquicias reales — ver
  restricción de `CLAUDE.md`), en vez de un único tema fijo para todos.

**Pregunta abierta — la más importante de este punto:** dado que el propio equipo confirma que el
tema fijo actual ya es funcional y suficiente, ¿este punto entra en el alcance de v2, o queda en
backlog para una v3 una vez resueltos los puntos con impacto real en la sesión (1, 2, 4)? Siguiendo
la regla de `CLAUDE.md` de no sumar alcance sin decisión explícita, se deja marcado como
**candidato a backlog** salvo que Cisco indique lo contrario.

---

## 6. 🔧 Nivel 2 — evitar mostrar una pantalla vacía en la primera retro de una sala

> Francisco: "si es la primera retro en que paso, ¿empieza?, en caso de que sí haya puntos previos
> de la retro anterior poner la pendiente"

Hoy (`front.md` HU-F16b, `back.md` sección 5) si el host no carga `previousActionNotes` al crear
la sala, el Nivel 2 igual se muestra, con un mensaje de "no hay ningún pendiente cargado". El
comentario de Francisco sugiere una pregunta de fondo: si es la primera vez que un equipo usa la
app (no hay ninguna retro anterior de la cual traer pendientes), ¿tiene sentido que el Nivel 2
exista igual en el recorrido de esa sala, aunque sea con un mensaje vacío?

**HU-V2-06 — Nivel 2 se salta automáticamente si el host indica que no hay retro anterior**
- **Dado** que el host está en el formulario de "Crear sala",
- **Cuando** dejar en blanco el campo de "Plan de acción de la retro anterior" (como ya se puede
  hacer hoy),
- **Entonces**, en vez de solo mostrar un mensaje de "sin pendientes" en el Nivel 2 (comportamiento
  actual), la fase `previous_action` se **omite directamente** del recorrido de esa sala —
  `phase:advance` desde el Nivel 1 (`welcome`) lleva directo al Nivel 3 (`keep_improve_try`), y
  `phaseHistory` nunca incluye `previous_action` para esa sala.
- **Y** si el host sí completa el campo, el comportamiento no cambia respecto a hoy: el Nivel 2 se
  muestra normalmente con ese texto.

**Pregunta abierta:** el campo de texto vacío hoy sirve doble propósito ("no hay retro anterior"
y "hay retro anterior pero no cargué nada por olvido/apuro") — con este cambio, ambos casos se
tratarían igual (se saltea el nivel). ¿Es aceptable esa ambigüedad, o convendría un campo explícito
tipo checkbox "¿Hubo una retro anterior con pendientes?" separado del textarea, para que el host
pueda decir "sí hubo, pero no tengo nada para poner" sin que eso salte el nivel? Esta segunda
opción agrega un campo nuevo al modelo de sala; la primera reutiliza el campo existente sin tocar
`shared-contract.md`.

---

## 7. ✅ Confirmado — feedback positivo, sin cambios de requisitos

- El flujo general se sintió claro y "tranquilamente podría aplicar a otro equipo" — valida la
  dirección de portabilidad del proyecto, más allá de los gaps concretos de las secciones 1 y 4.
- La ausencia de una temática predefinida (más allá de la mecánica base Keep/Improve/Try) no
  molestó — "lo mínimo indispensable" ya cumplió para esta sesión (ver contraste con la sección 5).
- La idea y metodología de la retro en general (Francisco: "estuvo muy buena la idea y la
  metodología").

---

## 8. Preguntas abiertas — resumen para decisión de Cisco antes de planificar implementación

| # | Pregunta | HU relacionada |
|---|---|---|
| 1 | Timer del Nivel 4: ¿reemplaza `secondsPerSpeaker` o coexisten modo fijo y modo por-card? ¿Piso mínimo con 0 cards? ¿Recalcular si se edita/borra una card a mitad de turno? | HU-V2-02 |
| 2 | Música ambiente: ¿solo en Nivel 3, o en todas las fases con tarjetas? | HU-V2-03 |
| 3 | Personajes genéricos: ¿alcanza un nuevo set fijo, o se evalúa un set por equipo/sala a futuro? | HU-V2-04 |
| 4 | Temáticas de sala: ¿entran en el alcance de v2, o quedan en backlog dado que el equipo confirmó que el tema fijo actual ya funciona? | HU-V2-05 |
| 5 | Nivel 2 sin retro anterior: ¿reutilizar el textarea vacío como señal de "saltear nivel", o sumar un campo explícito nuevo? | HU-V2-06 |

---

## 9. Explícitamente fuera de alcance de este documento

No se está proponiendo (ni se desprende del feedback) ninguno de estos puntos — se aclaran para no
asumir de más al planificar:

- Personajes o temáticas **subidas por el usuario** (upload de imágenes propias) — el feedback pide
  genericidad del set existente, no un sistema de personalización libre.
- Persistencia real entre sesiones de retro (el Nivel 2 sigue siendo texto pegado a mano, no un
  historial en base de datos — eso sigue explícitamente fuera de alcance del MVP según `CLAUDE.md`).
- Cualquier cambio a la mecánica de estrellas/votación (HU-F10/HU-B06) — no hubo feedback sobre eso.
