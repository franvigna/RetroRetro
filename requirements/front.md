# front.md — Requerimientos del Frontend

Stack: **React + Vite**, cliente de tiempo real con `socket.io-client`. Sin frameworks de CSS
pesados obligatorios — se puede usar CSS plano o una librería liviana, priorizando lograr la
estética "Retro Arcade" descripta en `CLAUDE.md`.

El frontend **nunca calcula el estado de la sala por su cuenta** (nivel actual, timer, estrellas
usadas, quién tiene la palabra) — siempre refleja lo último recibido en el evento `room:state`
del servidor (ver `shared-contract.md`). La única excepción es el cálculo del **Top 10 del Nivel
6 (Salón de la Fama)**, que se deriva del array `cards` ya recibido (ordenar por `votes.length`
descendente, mostrar los puestos del 1 al 10 con ranking denso y excluir las tarjetas con 0 votos) — tanto front como back parten de los mismos datos, así que
nunca pueden desincronizarse.

---

## 1. Identidad visual (resumen — ampliable durante el desarrollo)

- **Paleta:** colores saturados de arcade retro — magenta, cian, amarillo, naranja, violeta —
  sobre fondos oscuros o con bloques de color sólido. Usar rojo casi exclusivamente para errores
  o alertas, no como color decorativo principal.
- **Formas:** patrones geométricos repetidos (círculos concéntricos, chevrones, grillas tipo
  cassette/cartucho) como fondo o marco decorativo de secciones — no como fondo de texto
  legible, para no afectar la lectura.
- **Tipografía:** fuente tipo pixel/8-bit para títulos y nombres de nivel; una fuente legible
  estándar para el cuerpo de texto (los títulos pixelados grandes son difíciles de leer en
  párrafos largos).
- **Marcos:** las tarjetas y paneles pueden evocar un gabinete de arcade o un cartucho, con
  bordes gruesos y esquinas rectas (no redondeadas) para reforzar la estética retro.

> ⚠️ **Ningún asset (ícono, ilustración, texto, sonido) puede reproducir o referenciar personajes,
> logos o diseños de franquicias de videojuegos/consolas reales.** Todo el arte es original,
> inspirado en el género "arcade retro" en general. Íconos permitidos como referencia funcional:
> joystick, moneda, corazón (vida), estrella (puntaje), cápsula de power-up, cruceta, trofeo,
> bandera de meta — todos con diseño propio.

El copy de la interfaz debe sentirse como una partida de arcade (niveles, puntaje, "continue?",
"game over"), pero **sin sacrificar claridad** — alguien no técnico en el equipo tiene que
entender qué hacer sin explicación previa.

---

## 2. Layout y diseño responsivo

**Regla general: todo el contenido va centrado, nunca alineado a la izquierda por defecto.**
Cada pantalla usa un contenedor centrado (horizontal y, cuando el contenido es corto, también
vertical dentro del viewport) con un ancho máximo — el contenido nunca se estira borde a borde
en pantallas anchas, ni queda pegado a un costado.

### Breakpoints

| Rango | Dispositivo de referencia | Comportamiento |
|---|---|---|
| `≤ 640px` | Mobile | Una sola columna, elementos apilados verticalmente, contenedor con márgenes laterales chicos (ej: 16px) pero siempre centrado. Los controles de host (si aplica) se reorganizan en una barra fija inferior o superior, no flotando sueltos. |
| `641px – 1024px` | Notebook / tablet | Contenedor centrado con ancho máximo intermedio (ej: ~720-840px). Columnas de tarjetas (Keep/Improve/Try) pueden mostrarse 2 por fila o en scroll horizontal si no entran. |
| `≥ 1025px` | Monitor / desktop | Contenedor centrado con ancho máximo definido (ej: ~1000-1200px) — **no ocupar todo el ancho de un monitor grande**, para no perder legibilidad ni la sensación de "gabinete" contenido. Columnas de tarjetas se muestran una al lado de la otra sin scroll horizontal. |

### Principios generales

- Usar layout flexible (Flexbox/Grid) con un wrapper central reutilizable en todas las pantallas,
  en vez de resolver el centrado pantalla por pantalla.
- El header (nombre de nivel, timer, contador de estrellas cuando aplica) se mantiene visible y
  centrado en la parte superior en todos los tamaños de pantalla — en mobile puede volverse
  sticky para no perderlo al scrollear las tarjetas.
- Los controles exclusivos de host no deben tapar contenido en mobile — considerar una barra de
  acciones fija en la parte inferior de la pantalla en ese breakpoint.
- Probar especialmente la pantalla de nivel activo con varias tarjetas (5-10) en los tres
  breakpoints, ya que es la que más contenido dinámico acumula.

---

## 3. Pantallas / vistas necesarias

1. **Landing / Inicio** — dos opciones: "Crear sala" (te vuelve host) o "Unirse a sala" (pedís
   código + tu nombre). Estética de pantalla de título de arcade.
2. **Crear sala (host)** — formulario con nombre del host y el selector de cantidad de estrellas
   por participante (ver sección 4, HU-F01).
3. **Insertar moneda (sala de espera)** — muestra código de sala, lista de participantes
   conectados en vivo, y (solo si sos host) un botón para iniciar la partida. Sin timer.
4. **Vista de nivel activo** — layout que se reutiliza para todos los niveles con timer:
   - Header centrado con: si la sala tiene `teamName` (ver HU-F01), una etiqueta pixel-art chica
     ("EQUIPO {NOMBRE}") arriba del título — ausente si no se completó ese campo opcional —, el
     nombre temático del nivel, timer (cuenta regresiva), y — **solo durante el Nivel 5 (Ranking
     de estrellas)** — el contador de estrellas disponibles del participante actual (ver HU-F10).
     La misma etiqueta de equipo aparece también en "Insertar moneda" y en "Game Over", con el
     mismo criterio.
   - Contenido específico del nivel (formulario para agregar tarjeta, columnas de tarjetas,
     tarjetas con ícono de estrella, lista de participantes con quién tiene la palabra, etc.
     según corresponda), siempre dentro del contenedor centrado descripto en la sección 2.
   - Si sos host: controles de facilitación (avanzar nivel, volver, pausar/reanudar timer,
     +5 min, y en el Nivel 4 además el control de "marcar quién habla").
   - Si sos participante: solo el contenido interactivo de ese nivel, sin controles de sala.
5. **Nivel 4 — Turno de jugador (Ronda de expresión)** — se muestra la lista de participantes, y
   quien el host marque como orador actual queda resaltado visualmente para todos (ver HU-F08).
   Debajo, se muestran también las columnas Keep/Improve/Try con **todas** las tarjetas ya
   escritas en el Nivel 3 (de todo el equipo, no solo las propias — ver HU-F08b), en modo
   **solo lectura sin votación** (sin botón de estrella, sin formulario para agregar tarjetas
   nuevas), salvo que cada participante puede editar o eliminar únicamente sus propias tarjetas
   (mismo mecanismo de lápiz/X que en el Nivel 3). El objetivo es dar soporte visual a la
   conversación hablada de este nivel, mostrando de qué se está hablando sin permitir escribir
   contenido nuevo todavía (eso llega recién en el Nivel 7).
6. **Nivel 6 — Salón de la Fama** — pantalla de solo lectura (no se agregan tarjetas nuevas) que
   muestra automáticamente el ranking de tarjetas con puestos del 1 al 10 según sus estrellas,
   presentadas como el "podio" de la partida (ej: 1er, 2do y 3er lugar), para que el equipo las
   discuta en profundidad durante el tiempo de ese nivel.
7. **Game Over (cierre)** — resumen final tipo pantalla de "high score": plan de acción
   consolidado (tarjetas de la columna `action_plan`) presentado como el "puntaje final" de la
   sesión.
8. **Estado de "conectando" / reconectando** — pantalla o indicador visible cuando el cliente
   está esperando que el backend de Render despierte (cold start) o se está reconectando tras un
   corte de red. Se puede presentar como una pantalla de carga tipo "loading level..." acorde a
   la estética. Ver `infra.md` para contexto de por qué es necesario.

---

## 4. Historias de usuario

### Como Anfitrión

**HU-F01 — Crear una sala**
> Como anfitrión, quiero crear una sala nueva ingresando mi nombre y definiendo cuántas
> estrellas va a tener cada participante para votar, para adaptar la dinámica a mi equipo.
- **Dado** que estoy en la Landing y elijo "Crear sala",
- **Cuando** ingreso mi nombre y elijo la cantidad de estrellas por participante usando el
  selector deslizable (ver detalle abajo),
- **Cuando** confirmo,
- **Entonces** el sistema me lleva a la pantalla "Insertar moneda" como host, mostrando un
  código de sala único para compartir.
- **Detalle del selector:** control deslizable horizontal (arrastrar), rango de **1 a 10**,
  valor por defecto **5**, mostrando el número seleccionado en todo momento mientras se arrastra
  (no solo al soltar).
- **Nota:** no hay ningún campo para definir un "tema" de antemano — el Nivel 6 (Salón de la
  Fama) se calcula solo, en base a lo que el equipo escriba y vote durante la sesión.
- **Campo opcional "Plan de acción de la retro anterior":** textarea de texto libre (máximo 2000
  caracteres) donde el host puede pegar, por ejemplo, las acciones concretas copiadas del Game
  Over de la sesión anterior. Se muestra tal cual al equipo en el Nivel 2 (ver HU-F16b). No hay
  ninguna validación de formato — es texto plano sin estructura, y queda vacío por defecto si no
  se completa.
- **Campo opcional "Nombre del equipo":** input de texto libre (máximo 60 caracteres), en el mismo
  paso 3 del formulario, junto al textarea anterior. Si el host lo completa (ej: "Jaliscom"),
  aparece como una etiqueta pixel-art chica arriba del título de cada nivel (Insertar Moneda,
  Nivel 1 a 7, Game Over) y como título en el PDF exportado desde Game Over (`Retro del equipo
  "{nombre}"`). Si se deja vacío, la app se ve exactamente igual que sin esta feature — no hay
  ningún placeholder ni etiqueta vacía en su lugar.

**HU-F01b — Copiar un link para invitar participantes**
> Como anfitrión (o cualquier participante ya en la sala), quiero copiar un link directo para
> compartirlo por chat, en vez de dictar el código de sala a viva voz.
- **Dado** que estoy en "Insertar moneda",
- **Cuando** toco el botón "Copiar link para invitar",
- **Entonces** se copia al portapapeles una URL del tipo `{origin}/join/{code}`, y el botón
  confirma visualmente ("¡Copiado!") por un par de segundos.
- **Y cuando** alguien abre ese link,
- **Entonces** llega directo al paso 2 de "Unirse a sala" (nombre + personaje), sin tener que
  tipear el código a mano — el paso 1 se saltea porque el código ya viene en la URL.

**HU-F02 — Iniciar la partida desde la sala de espera**
> Como anfitrión, quiero iniciar la partida cuando estén los participantes que necesito, para
> controlar cuándo arranca la retro.
- **Dado** que estoy en "Insertar moneda" como host,
- **Cuando** presiono "Iniciar partida",
- **Entonces** todos los conectados pasan al Nivel 1 (Bienvenida) con su timer correspondiente.

**HU-F03 — Controlar el avance de niveles**
> Como anfitrión, quiero avanzar o retroceder de nivel manualmente, para adaptar el ritmo de la
> reunión a lo que necesite el equipo en el momento.
- **Dado** que estoy en cualquier nivel activo como host,
- **Cuando** presiono "Siguiente nivel" o "Nivel anterior",
- **Entonces** todos los participantes ven el nuevo nivel reflejado en tiempo real, sin
  necesidad de recargar la página.

**HU-F04 — Manejar el timer de un nivel**
> Como anfitrión, quiero pausar, reanudar o sumar 5 minutos al timer del nivel actual, para
> darle margen al equipo si alguien está completando algo o se cae de la llamada.
- **Dado** que hay un timer corriendo en el nivel actual,
- **Cuando** presiono pausar, reanudar, o +5 min,
- **Entonces** el timer visible para todos los participantes refleja ese cambio inmediatamente.

**HU-F05 — Ver el plan de acción consolidado en "Game Over"**
> Como anfitrión, quiero ver todas las tarjetas de plan de acción juntas al cierre, para poder
> repasarlas con el equipo antes de terminar la partida.

**HU-F06 — Marcar quién tiene la palabra (Turno de jugador)**
> Como anfitrión, quiero marcar manualmente a qué participante le toca hablar durante la Ronda
> de expresión, para conducir la dinámica sin depender de un orden automático rígido.
- **Dado** que estoy en el Nivel 4 (Turno de jugador) como host,
- **Cuando** toco el nombre de un participante en la lista,
- **Entonces** ese participante queda resaltado como "orador actual" para todos en tiempo real.
- **Cuando** toco "Limpiar turno" (o vuelvo a tocar al mismo participante ya resaltado),
- **Entonces** nadie queda resaltado hasta que marque al siguiente.
- **Nota:** no hay un orden predefinido ni obligatorio — el host decide libremente a quién le
  toca en cada momento, para poder adaptarse si alguien cede su turno o quiere agregar algo
  después.

### Como Participante

**HU-F07 — Unirme a una sala existente (en dos pasos)**
> Como participante, quiero unirme a una sala con un código, mi nombre y un
> personaje pixel-art, para participar de la retro sin necesidad de crear una cuenta.
- **Paso 1 — Código de sala:** el único campo es el código de sala. No se pide nombre todavía.
- **Dado** que ingreso un código de sala,
- **Cuando** avanzo al paso 2,
- **Entonces** el frontend valida contra el servidor que la sala existe (o lo valida recién al
  emitir `room:join` al final del paso 2 — decisión de implementación, no cambia el contrato).
- **Paso 2 — Nombre y personaje:** una vez el código es válido, se muestra un campo de nombre
  **obligatorio** y una grilla de selección de personaje pixel-art **obligatoria** (ver `AVATAR_IDS`
  en `shared-contract.md` sección 1 — generados con la herramienta interna Avatar Lab a partir de
  fotos reales de los integrantes de Jaliscom).
- **Dado** que estoy en el paso 2 con un código válido,
- **Cuando** completo mi nombre y elijo un personaje (tocar de nuevo el mismo puede deseleccionarlo,
  pero el formulario no permite continuar hasta elegir uno) y confirmo,
- **Entonces** quedo en "Insertar moneda" de esa sala, visible para los demás participantes y el
  host, con mi personaje elegido (si elegí uno) visible junto a mi nombre en la lista de
  participantes.
- **Y si** el código no existe, veo un mensaje claro de error y vuelvo al paso 1 sin romper la
  pantalla.

**HU-F08 — Ver quién tiene la palabra (Turno de jugador)**
> Como participante, quiero ver claramente a quién le toca hablar en cada momento de la Ronda de
> expresión, para saber cuándo me toca a mí y prestar atención a quien está compartiendo su
> visión.
- **Dado** que estoy en el Nivel 4 (Turno de jugador),
- **Cuando** el host marca a un participante como orador actual,
- **Entonces** veo a esa persona resaltada visualmente en la lista, en tiempo real y sin recargar.
- La lista de oradores no tiene ninguna acción para el participante — es un apoyo visual a una
  conversación en vivo, no una mecánica interactiva. La única interacción disponible en este
  nivel para cualquier rol es sobre las tarjetas de Keep/Improve/Try (ver HU-F08b).

**HU-F08b — Ver todas las tarjetas de Keep/Improve/Try durante la Ronda de expresión**
> Como participante, quiero ver todo lo que escribió el equipo entero en el Nivel 3 mientras
> estamos en la Ronda de expresión, para tener el contexto completo de la conversación — y poder
> corregir mi propio aporte si me expreso mejor hablando que por escrito.
- **Dado** que estoy en el Nivel 4 (Turno de jugador),
- **Entonces** veo las columnas Keep/Improve/Try con las tarjetas de **todo el equipo** (ya no
  solo las mías — el filtro de anti-anclaje del Nivel 3, ver HU-F09b, dejó de aplicar al
  avanzar de fase).
- **Y** no veo ningún botón de estrella en las tarjetas (todavía no llegamos al Nivel 5) ni
  ningún formulario para agregar tarjetas nuevas en esta pantalla.
- **Y** puedo tocar el lápiz para editar o la X para eliminar únicamente mis propias tarjetas
  (mismo mecanismo que HU-F09c) — las de los demás se ven pero sin ningún control de edición.
- **Y** todas las tarjetas escritas por `currentSpeakerId` se resaltan visualmente mientras esa
  persona tiene la palabra; al cambiar el orador, el resaltado pasa a sus tarjetas en tiempo real.

**HU-F09 — Agregar una tarjeta en el nivel correspondiente**
> Como participante, quiero escribir una tarjeta de texto libre en la columna que corresponda
> (Keep/Improve/Try, o plan de acción), para aportar mi visión a la retro.
- **Dado** que estoy en un nivel que admite tarjetas (Nivel 3 o Nivel 7),
- **Cuando** escribo un texto y confirmo,
- **Entonces** la tarjeta aparece en tiempo real para mí (y para todos los demás, salvo la
  excepción de visibilidad del Nivel 3 — ver HU-F09b), con mi nombre como autor.
- **Y si** el texto está vacío, el sistema no permite enviarla y muestra por qué.
- **Nota:** el Nivel 4 (Turno de jugador) y el Nivel 6 (Salón de la Fama) **no** admiten
  tarjetas nuevas — el primero es un momento hablado (aunque sí muestra en solo lectura las
  tarjetas ya escritas en el Nivel 3, ver HU-F08b), y el segundo es una vista automática de lo
  ya escrito y votado.
- **Pregunta disparadora por columna:** cada columna de Keep/Improve/Try muestra, debajo del
  título, una pregunta corta para ayudar a arrancar a escribir sin tener que explicar la
  dinámica de memoria — Keep: "¿Qué funcionó y hay que mantener?"; Improve: "¿Qué se puede
  mejorar?"; Try: "¿Qué nos gustaría probar?".

**HU-F09b — Tarjetas propias ocultas en el Nivel 3 hasta avanzar**
> Como participante, quiero ver solo mis propias tarjetas mientras el Nivel 3 sigue activo, para
> escribir mi aporte genuino sin que lo que ya escribieron otros me condicione — y descubrir todo
> junto cuando el equipo avanza a debatirlo.
- **Dado** que estoy en el Nivel 3 (Keep, Improve, Try),
- **Cuando** otro participante agrega una tarjeta,
- **Entonces** no la veo en mi pantalla — solo veo las que yo mismo escribí.
- **Y cuando** el host avanza al Nivel 4,
- **Entonces** paso a ver todas las tarjetas del Nivel 3 (las mías y las de todos), y así se
  mantiene por el resto de la sesión.
- Esta regla es exclusiva del Nivel 3: en el Nivel 7 (plan de acción) siempre se ve todo en vivo,
  porque ahí se define la acción en conjunto, no es un aporte individual.

**HU-F09c — Editar o eliminar una tarjeta propia**
> Como participante, quiero poder corregir o borrar una tarjeta que yo mismo escribí, para
> arreglar un error de tipeo o retractarme sin depender de nadie más.
- **Dado** que tengo una tarjeta propia visible en pantalla (en cualquier columna, en cualquier
  fase donde `card:add` esté habilitado),
- **Cuando** hago doble click sobre ella, o toco el ícono de lápiz,
- **Entonces** se habilita edición inline con el mismo formulario que se usó para crearla.
- **Y cuando** toco el ícono de "X",
- **Entonces** aparece una confirmación breve con `Cancelar / Eliminar`; solo al confirmar se
  elimina para siempre. En el Nivel 4 también se aclara que allí no pueden agregarse tarjetas nuevas.
- Estos dos controles (lápiz y X) solo aparecen en tarjetas de las que soy autor — nunca en
  tarjetas ajenas, ni siquiera si soy el host.

**HU-F10 — Repartir estrellas de puntaje**
> Como participante, quiero ver cuántas estrellas me quedan y repartirlas entre las tarjetas que
> me parecen más importantes, para ayudar a priorizar de qué se habla primero.
- **Dado** que estoy en el Nivel 5 (Ranking de estrellas),
- **Cuando** entro a la pantalla,
- **Entonces** veo en el **header, arriba de todo**, cuántas estrellas tengo disponibles del
  total configurado por el host (ej: "★★★ 2 disponibles" o representación visual equivalente).
- **Cuando** toco una tarjeta que todavía no tiene mi estrella,
- **Entonces** se le asigna mi estrella **con una animación** (la estrella se anima desde el
  contador del header hacia la tarjeta, o un efecto de aparición/pulso claro en la tarjeta), y el
  contador del header baja en 1.
- **Cuando** toco una tarjeta que ya tiene mi estrella,
- **Entonces** se la retiro **con una animación** (inversa a la anterior), y el contador del
  header sube en 1.
- **Y si** ya usé todas mis estrellas disponibles e intento asignar una nueva a otra tarjeta,
- **Entonces** el sistema lo impide (visualmente y a nivel de datos, ver `back.md`) sin necesidad
  de un mensaje de error intrusivo — alcanza con que la interacción no tenga efecto y el
  contador se mantenga en 0.
- **Sin texto redundante:** no hay ningún label del tipo "asignar estrella" o "votar" en la UI —
  el ícono (estrella llena o vacía) y el contador del header son autoexplicativos.
- **Regla siempre vigente:** como máximo una estrella propia por tarjeta (no se puede apilar más
  de una estrella del mismo participante sobre la misma tarjeta).

**HU-F11 — Ver el Top 10 automático en el Salón de la Fama**
> Como participante, quiero ver el ranking de las tarjetas más votadas sin que nadie tenga que
> definir el tema de antemano, para que la conversación de esa fase se enfoque en lo que
> realmente le importó al equipo ese día.
- **Dado** que la sesión llega al Nivel 6,
- **Cuando** se muestra la pantalla,
- **Entonces** veo todos los puestos del 1 al 10 (de cualquier columna del Nivel 3), con todas las tarjetas empatadas compartiendo el mismo puesto y sin incluir tarjetas con 0 votos,
  ordenadas de mayor a menor, sin poder agregar tarjetas nuevas en esta pantalla.

**HU-F11b — Formulario horizontal del plan de acción, con responsables por desplegable**
> Como participante, quiero completar la acción concreta y sus responsables en una misma fila, y
> elegir responsables desde un desplegable en vez de una lista fija siempre visible, para que el
> formulario del Nivel 7 sea más compacto y rápido de usar.
- **Dado** que estoy en el Nivel 7 (Guardar partida),
- **Cuando** veo el formulario de nueva tarjeta,
- **Entonces** el campo de acción concreta y los responsables se muestran en una misma fila
  horizontal (no apilados verticalmente uno debajo del otro), adaptado a columnas en pantallas
  angostas según la regla de layout responsivo obligatoria del proyecto.
- **Y cuando** toco el campo de responsables,
- **Entonces** se despliega la lista de participantes (con la opción "Todo el equipo") para
  elegir, y se cierra al elegir o al tocar afuera — no ocupa espacio fijo en la fila mientras no
  se usa.

**HU-F12 — Ver el estado de la partida sin poder controlarla**
> Como participante, quiero ver en qué nivel estamos y cuánto tiempo queda, para saber el ritmo
> de la reunión, sin tener botones de control que no me corresponden.

### Transversales (ambos roles)

**HU-F13 — Reconexión ante corte de red o refresh de página**
> Como cualquier usuario, quiero que si se me corta la conexión, o recargo la página sin querer
> (F5), recupere mi lugar en la sala (nombre, estrellas ya repartidas) en vez de tener que
> empezar de cero.
- El cliente guarda `{ code, name, avatarId, sessionToken }` en `sessionStorage` (única excepción
  admitida a la restricción de Storage de la sección 5 — nunca el estado de la sala en sí) al crear
  o unirse a una sala, y lo usa para reintentar `room:join` automáticamente en cuanto el socket
  conecta, sin volver a pedirle nada a la persona usuaria. `sessionToken` es lo que realmente
  autentica esa reconexión (ver `shared-contract.md` sección 4 y `back.md` HU-B02b) — sin él
  guardado en este browser, no hay forma de recuperar la identidad anterior, ni siquiera la propia
  desde otro dispositivo (trade-off aceptado a propósito, ver la misma sección).
- Mientras ese auto-join está en curso, se muestra una pantalla de "Reconectando..." — nunca el
  formulario de nombre, que solo aparece si no hay identidad guardada para recuperar (ej: alguien
  entra por primera vez a la URL de una sala vía el link de otra persona). En ese caso, escribir un
  nombre ahí siempre da de alta a alguien nuevo — nunca reconecta como otro participante.
- Si la sala guardada ya no existe (`room:not_found`), se limpia la identidad guardada para no
  reintentar en loop, y recién ahí se pide el nombre manualmente.
- Si la partida ya arrancó y el intento de entrar (sin `sessionToken` válido) llega igual, el
  servidor responde `room:join_locked` — la pantalla de "Reconectar" pasa a mostrar "Sala cerrada"
  en lugar del formulario, y el paso 2 de "Unirse a sala" muestra el mismo aviso.

**HU-F16b — Nivel 2: repaso de la retro anterior**
> Como participante, quiero ver el resumen que el anfitrión cargó de la retro anterior al crear
> la sala, para retomar el hilo de lo que quedó pendiente antes de arrancar esta.
- **Dado** que la sesión llega al Nivel 2 (`previous_action`),
- **Cuando** se muestra la pantalla,
- **Entonces** veo el texto libre que el host cargó en "Crear sala" (si cargó alguno), mostrado
  tal cual, respetando saltos de línea.
- **Y si** el host no cargó nada,
- **Entonces** veo un mensaje claro indicando que no hay ningún pendiente cargado para esta
  sesión, en vez de una pantalla vacía o confusa.
- No hay ninguna tarjeta ni votación en este nivel — es solo lectura, para dar pie a la
  conversación oral del equipo.

**HU-F14 — Indicador de "conectando"**
> Como cualquier usuario, quiero ver un indicador claro cuando la app está estableciendo
> conexión con el servidor (por ejemplo al despertar el backend dormido de Render), para no
> pensar que la app está rota.

**HU-F15 — Servidor al tope de capacidad**
> Como cualquier usuario, quiero un mensaje claro si el servidor rechaza mi conexión por estar al
> tope de su capacidad (ver back.md HU-B11), en vez de quedar viendo un "conectando..." infinito.
- **Dado** que el servidor ya tiene `MAX_CONCURRENT_CONNECTIONS` sockets activos,
- **Cuando** intento conectarme,
- **Entonces** veo el mensaje "El servidor está al tope de su capacidad. Probá de nuevo en unos
  minutos." en el banner de conexión (estado `SERVER_FULL`), y la app **no** reintenta la
  conexión en loop automáticamente.

---

## 5. Restricciones técnicas específicas del frontend

- **Prohibido usar `localStorage` o `sessionStorage` para el estado de la sala** (fases, timer,
  tarjetas, votos, etc.) — eso vive únicamente en memoria de React (Context), reflejando siempre
  lo último recibido en `room:state`. **Única excepción admitida:** `sessionStorage` guarda el
  mínimo necesario para sobrevivir un refresh de página (HU-F13) — `{ code, name, avatarId,
  sessionToken }` —,
  nunca `localStorage` (que sobreviviría entre pestañas/sesiones distintas, lo cual no es
  deseable acá). Se limpia al salir explícitamente de la sala o si el código guardado ya no
  existe.
- El cliente debe manejar explícitamente los tres estados de conexión del socket: conectando,
  conectado, desconectado — con feedback visual en los tres casos, idealmente integrado a la
  estética (ej: pantalla de "loading level...").
- Los controles exclusivos de host (avanzar nivel, timer, marcar orador, etc.) deben estar
  ocultos para participantes en la UI, pero esto es solo una mejora de experiencia — la
  seguridad real está en el backend (ver `back.md` y `shared-contract.md`), nunca asumir que
  ocultar el botón alcanza como control de acceso.
- **Ningún asset gráfico, tipográfico o sonoro puede ser una reproducción o adaptación directa
  de un juego, consola o franquicia real** — todo se diseña o genera desde cero, inspirado en el
  género de forma genérica (ver regla de diseño en `CLAUDE.md`).
- El layout centrado y responsivo (sección 2) es un requisito transversal a **todas** las
  pantallas listadas en la sección 3, no solo a la Landing.
- Las animaciones de asignar/retirar estrella (HU-F10) deben poder desactivarse o simplificarse
  sin romper la funcionalidad, pensando en accesibilidad (usuarios con preferencia de movimiento
  reducido) — si el framework de CSS elegido soporta `prefers-reduced-motion`, respetarlo.

---

## 6. Testing requerido — Frontend

### 6.1 Pruebas unitarias (por componente/lógica, ej: Vitest + React Testing Library)

- Renderizado correcto de cada pantalla con datos de ejemplo (mock de `RoomState`).
- El formulario de "Crear sala" no permite enviar sin nombre.
- El selector deslizable de estrellas nunca permite un valor menor a 1 ni mayor a 10, y por
  defecto arranca en 5.
- El formulario de "Unirse a sala" paso 1 no avanza sin código. El paso 2 no permite enviar sin
  nombre ni sin personaje seleccionado.
- La grilla de personajes del paso 2 permite tocar un personaje para seleccionarlo y volver a
  tocarlo para deseleccionarlo (vuelve a `avatarId: null`).
- El formulario de agregar tarjeta no permite enviar texto vacío.
- El timer se renderiza correctamente en formato `mm:ss` a partir de `remainingSeconds`.
- Los controles de host (avanzar, timer, marcar orador, etc.) no se renderizan cuando el rol es
  `participant`.
- En el Nivel 4, el participante marcado como `currentSpeakerId` se muestra resaltado, y cuando
  ese valor es `null` nadie aparece resaltado.
- El contador de estrellas del header calcula correctamente `starsPerParticipant - estrellas ya
  usadas por el participante actual`, a partir de un `RoomState` de ejemplo.
- El ícono de estrella de una tarjeta refleja visualmente si el usuario actual ya le asignó su
  estrella o no.
- Al simular un intento de asignar una estrella cuando el contador ya está en 0, el componente no
  dispara el evento `card:vote` (previene la llamada innecesaria, aunque la validación real esté
  en el backend).
- El cálculo del Top 10 del Nivel 6 ordena correctamente un array de tarjetas de ejemplo por
  `votes.length` descendente, excluye las de 0 votos y muestra todos los empates de cada puesto
  hasta el puesto 10 con ranking denso (`1, 1, 2, 2, 3...`).
- Manejo de los tres estados de conexión del socket (mock del cliente de socket.io) — se
  muestra el indicador correcto en cada estado.
- Pruebas de layout: el contenedor principal mantiene un ancho máximo y queda centrado en
  simulaciones de viewport mobile, notebook y monitor (ej: usando utilidades de testing de
  tamaño de viewport de la librería elegida).

### 6.2 Pruebas end-to-end (ej: Playwright o Cypress, contra front + back reales o mockeados)

- **E2E-F01:** un usuario crea una sala definiendo una cantidad de estrellas distinta al default
  (ej: 5) usando el selector, ve el código generado, y queda en "Insertar moneda" como host.
- **E2E-F02:** un segundo usuario se une con ese código y aparece en la lista de participantes
  del primero, en tiempo real.
- **E2E-F02b:** el host copia el link de invitación desde "Insertar moneda"; un segundo usuario
  abre ese link y llega directo al paso 2 (nombre), sin tipear el código.
- **E2E-F03:** el host inicia la partida y ambos usuarios ven la transición al Nivel 1 al mismo
  tiempo.
- **E2E-F04:** el host avanza de nivel y el participante ve el cambio sin recargar la página.
- **E2E-F05:** un participante agrega una tarjeta y aparece para el host y para otros
  participantes en tiempo real.
- **E2E-F06:** en el Nivel 4, el host marca a un participante como orador y ambos (host y
  participantes) lo ven resaltado en tiempo real; el host limpia el turno y el resaltado
  desaparece para todos.
- **E2E-F07:** en el Nivel 5, un participante ve su contador de estrellas disponibles en el
  header, le asigna una estrella a una tarjeta (el contador baja), y al volver a tocarla se
  retira (el contador sube de nuevo).
- **E2E-F08:** un participante reparte todas sus estrellas disponibles y luego intenta asignar
  una más a otra tarjeta — la interacción no tiene efecto, y el estado de la sala no cambia para
  nadie.
- **E2E-F09:** al llegar al Nivel 6, se muestran automáticamente todos los puestos hasta el Top 10, con empates compartiendo puesto, de las tarjetas con más
  estrellas de la sesión, sin que el host haya tenido que configurar ningún tema previamente.
- **E2E-F10:** intentar unirse con un código inexistente muestra un error claro sin romper la
  navegación.
- **E2E-F11:** un participante intenta acceder a un control de host (vía manipulación directa,
  no por UI) y el sistema lo rechaza sin afectar el estado de la sala para los demás.
- **E2E-F12:** flujo completo de una partida de punta a punta: crear sala → unirse → iniciar →
  pasar por todos los niveles (incluyendo Turno de jugador y el Salón de la Fama automático) →
  llegar a "Game Over" → ver plan de acción consolidado.
- **E2E-F13:** el mismo flujo del E2E-F12 ejecutado en tres tamaños de viewport (mobile, notebook,
  monitor), verificando que el contenido se mantenga centrado y legible en los tres casos.
