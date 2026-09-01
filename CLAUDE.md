# CLAUDE.md — Proyecto: RetroRetro

## 🎯 Visión del proyecto

**RetroRetro** es una aplicación web que permite facilitar retrospectivas ágiles en tiempo real
para cualquier equipo de desarrollo de software. El objetivo no es solo entregar una herramienta
funcional, sino un proyecto que sirva como marco de aprendizaje real de desarrollo full-stack
(React + Vite en el front, Node + Express + Socket.io en el back), con foco en tiempo real,
manejo de estado en el servidor, y despliegue en infraestructura gratuita.

La app está pensada para ser **genérica** (cualquier equipo de dev/scrum la puede usar), pero
la primera versión se diseña específicamente para el equipo "Jaliscom", que ya viene facilitando
retros manualmente (Miro + Notion) y quiere pasar a una herramienta propia.

### Quién soy yo (el dueño del producto)

Soy Cisco. Trabajo en el equipo Jaliscom, donde organizo procesos de equipo, incluyendo las
retrospectivas de sprint. Ya facilité dos retros anteriores usando Miro (formato Barco:
Viento/Rocas/Anclas/Isla) y un board tipo Keep/Improve/Try con votación. Esta app es el siguiente
paso: reemplazar esas herramientas genéricas por algo propio, con una identidad visual definida
y controles de facilitación (timers, fases, roles) que hoy hago "a mano".

Uso este proyecto para aplicar y profundizar mis conocimientos de desarrollo, así que priorizo
**entender lo que se construye** por sobre la velocidad de entrega. Prefiero que el código sea
explicado y que las decisiones de arquitectura queden documentadas, antes que recibir una
solución "caja negra" que funcione pero no pueda mantener yo mismo después.

---

## 🕹️ Temática y experiencia: "Retro Arcade"

**Temática visual: arcade retro de los 80s/90s** Colores saturados
(magenta, cian, amarillo, naranja, violeta) sobre fondos oscuros, patrones geométricos, tipografía tipo pixel/8-bit para títulos, y marcos de tarjetas


> ⚠️ **Regla de layout obligatoria:** toda la aplicación se diseña **centrada**, nunca alineada a
> la izquierda por defecto, y con **diseño responsivo real** para mobile, notebook y monitor. El
> detalle de breakpoints y comportamiento por tamaño de pantalla está en `requirements/front.md`,
> sección "Layout y diseño responsivo" — es de cumplimiento obligatorio en todas las pantallas,
> no solo en la Landing.

**Mapeo temático de fases** (nombres de referencia, ajustables durante el desarrollo si algo no
se siente natural en la UI real):

| Fase                                  | Nombre temático                                         |
|-----------------------------------------|----------------------------------------------------------|
| Sala de espera                        | `INSERTAR MONEDA` — pantalla de espera tipo arcade antes de arrancar |
| Bienvenida + reglas                   | `NIVEL 1 — Cómo jugar` (instrucciones)                    |
| Revisión de acción anterior *(opcional)* | `NIVEL 2 — Continue? (puntaje anterior)`               |
| Keep / Improve / Try                  | `NIVEL 3 — Power-ups, trampas e ítems nuevos`             |
| Ronda de expresión (verbal, sin tarjetas) | `NIVEL 4 — Turno de jugador`                          |
| Agrupación + votación                 | `NIVEL 5 — Ranking de estrellas`                          |
| Ranking Top 10, para profundizar      | `NIVEL 6 — Salón de la Fama`                              |
| Plan de acción                        | `NIVEL 7 — Guardar partida`                               |
| Cierre                                | `GAME OVER — High Score`                                  |

> **Sobre el Nivel 2 (opcional):** no es parte del proceso de retro original de Jaliscom (el que
> usan en Trello) — es un agregado propio de Cisco para darle continuidad a las retros de una
> sesión a la siguiente. Se mantiene en el flujo de la app como una mejora, no como parte del
> proceso base.

> **Sobre el Nivel 4 (Turno de jugador):** es un momento **hablado**, no se escriben tarjetas.
> Cada integrante tiene su turno para plantear su visión del equipo. El host va marcando quién
> tiene la palabra en cada momento (no hay un orden automático fijo, para poder adaptarse si
> alguien pasa su turno). Ver mecánica completa en `requirements/front.md` y
> `requirements/back.md`.

> **Importante sobre el Nivel 6 (Salón de la Fama):** no es un tema definido de antemano por el
> host. Es una fase **automática**: el sistema calcula el ranking de puestos del 1 al 10 según las estrellas del
> Nivel 5 y las muestra para que el equipo profundice la conversación sobre esos temas puntuales
> — que van a ser distintos en cada retro, según lo que el equipo mismo haya escrito y votado ese
> día. No requiere ningún campo de configuración al crear la sala.

**Mecánica de votación:** cada participante dispone de una cantidad **limitada** de estrellas de
puntaje (diseño propio, no ligadas a ningún juego existente) para repartir entre las tarjetas que
le parecen más importantes — **como máximo una estrella propia por tarjeta**. Esa cantidad total
es configurable por el host al crear la sala (mínimo 1, máximo 10, valor por defecto 5 — ver
detalle del selector en `front.md`). Tocar una tarjeta sin estrella propia le asigna una (con una
animación de confirmación); tocar una tarjeta que ya tiene
mi estrella la retira (también animado). No hay texto "asignar estrella" en la interfaz — el
estado se comunica solo con el ícono (lleno/vacío) y un contador visible de estrellas disponibles
en la cabecera de la pantalla durante el Nivel 4.

---

## 👥 Roles

- **Anfitrión (host):** crea la sala, controla el avance de niveles, maneja el timer (iniciar,
  pausar, sumar +5 min, avanzar, retroceder), y tiene visibilidad total del estado.
- **Participante:** se une a una sala existente con un código/link, agrega tarjetas, reparte
  estrellas de puntaje, y ve el estado de la sesión en tiempo real, pero no puede cambiar de
  nivel ni controlar el timer.

---

## 🧭 Flujo de la sesión (alto nivel)

1. El anfitrión crea una sala → se genera un código corto.
2. Los participantes entran con ese código + su nombre → quedan en la pantalla **Insertar
   moneda** (sala de espera, sin timer), pendientes de que el anfitrión inicie la partida.
3. El anfitrión inicia → arranca el Nivel 1 (Bienvenida), y así sucesivamente por cada nivel
   definido arriba, con timer visible para todos.
4. En los niveles relevantes, los participantes agregan tarjetas y/o reparten estrellas.
5. Al llegar a "Game Over", la sesión termina (en el MVP no hay persistencia — el estado vive
   solo mientras la sala esté activa en el servidor).

El detalle completo de las historias de usuario está en `requirements/front.md` y
`requirements/back.md`.

---

## 🏗️ Stack técnico

- **Frontend:** React + Vite, `socket.io-client`. Deploy en Netlify o Vercel (sitio estático).
- **Backend:** Node.js + Express + `socket.io`, estado de cada sala **en memoria** (sin base de
  datos en esta primera versión). Deploy en Render (free tier, plan web service).
- **Repositorio:** un único repo (monorepo simple), sin herramientas de monorepo tipo Turborepo —
  alcanza con dos carpetas independientes. Repo en GitHub: `RetroRetro`.

```
RetroRetro/
├── front/          ← Vite + React
├── back/           ← Express + Socket.io
├── .gitignore
├── CLAUDE.md
└── requirements/
    ├── front.md
    ├── back.md
    ├── infra.md
    ├── shared-contract.md
    └── testing.md
```

### Por qué este stack (contexto para no re-discutirlo)

- Se descartó Next.js + Vercel + Supabase Realtime porque el objetivo es aprender a programar
  el servidor de tiempo real "de verdad" (rooms, eventos custom, estado en el servidor), no
  delegarlo a un servicio externo.
- Se descartó cualquier plataforma que pida tarjeta de crédito (Fly.io, Railway con crédito
  limitado, Northflank, Koyeb): el proyecto tiene que ser **100% gratis, sin excepciones**.
- Render fue elegido porque no pide tarjeta, soporta WebSockets de verdad (no serverless), y sus
  límites (750 horas/mes, 100 GB de banda) son más que suficientes para el patrón de uso real
  (sesiones puntuales de 1-2 horas, no tráfico constante). El único trade-off conocido y aceptado
  es que el servicio gratis "duerme" a los 15 minutos de inactividad y tarda 30-60 segundos en
  despertar en la primera conexión — hay que diseñar la UI para comunicar ese estado de
  "conectando" en vez de que parezca colgado. Detalle completo en `requirements/infra.md`.

---

## 📦 Alcance del MVP (primera etapa)

Explícitamente **dentro** de alcance:
- Crear una sala como anfitrión.
- Unirse a una sala como participante con código/link.
- Avance de niveles controlado por el anfitrión, con timer sincronizado para todos.
- Agregar tarjetas de texto en los niveles correspondientes.
- Configurar la cantidad de estrellas por participante al crear la sala (mínimo 1, máximo 10,
  default 5).
- Repartir estrellas de puntaje sobre tarjetas (sistema de votación, ver detalle en `front.md`).
- Ver automáticamente el ranking Top 10 en el Nivel 6 (Salón de la Fama), compartiendo puesto cuando hay empate.
- Ver el plan de acción final consolidado en "Game Over".

Explícitamente **fuera** de alcance en esta etapa (no lo implementes salvo que se pida
explícitamente más adelante):
- Persistencia en base de datos (histórico de retros pasadas).
- Autenticación de usuarios (login, cuentas).
- Soporte multi-organización o multi-equipo con configuración propia.
- Editar o eliminar tarjetas después de creadas (se puede dejar como mejora futura).
- Exportar resultados a PDF/Notion/Miro (posible V2, no ahora).

---

## 📋 Documentos de requerimientos

Antes de escribir una sola línea de código, leé completos estos documentos — cada uno define
historias de usuario, criterios de aceptación y requisitos de testing para su área:

- **`requirements/front.md`** — pantallas, componentes, historias de usuario del frontend,
  manejo de estado en cliente, testing unitario y de componentes.
- **`requirements/back.md`** — modelo de datos de la sala, lógica de negocio del servidor,
  historias de usuario del backend, testing unitario del servidor.
- **`requirements/shared-contract.md`** — el contrato de eventos de Socket.io compartido entre
  front y back. Este archivo es la **fuente de verdad** de nombres de eventos y payloads; si
  front.md o back.md dicen algo distinto a este archivo, prevalece `shared-contract.md`.
- **`requirements/infra.md`** — estructura de deploy, configuración de Render y
  Netlify/Vercel, variables de entorno, límites del free tier.
- **`requirements/testing.md`** — pruebas end-to-end que cruzan front y back (flujos completos
  de usuario), además de la estrategia general de testing del proyecto.

---

## ⚙️ Modo de trabajo esperado

1. **Empezá en modo plan.** No escribas código todavía. Primero leé todos los documentos de
   `requirements/`, y armá un plan de implementación (por ejemplo: orden de desarrollo sugerido,
   estructura de carpetas dentro de `front/` y `back/`, lista de dependencias a instalar,
   supuestos que estás tomando). Presentame ese plan antes de tocar código.
2. **Preguntá si falta información.** Si algo en los requerimientos es ambiguo, contradictorio,
   o simplemente no está definido (por ejemplo: un detalle visual, un caso borde de negocio, una
   decisión de nomenclatura), preguntámelo directamente antes de asumir algo y avanzar. Prefiero
   una pregunta de más que una decisión tomada por vos que después haya que deshacer.
3. **Priorizá explicar, no solo entregar.** Cuando tomes una decisión técnica no trivial (por
   ejemplo: cómo modelás el estado del timer, cómo evitás que un participante manipule el estado
   de la sala), explicá brevemente el porqué, no solo el código.
4. **Seguí el alcance del MVP.** No agregues funcionalidad fuera de lo definido en la sección de
   alcance sin preguntarme primero, aunque te parezca una buena idea — prefiero decidir yo cuándo
   sumamos scope nuevo.

---

## ❓ Antes de arrancar

Antes de iniciar el modo plan, decime si necesitás información adicional de mi parte que no esté
cubierta en este documento o en los de `requirements/`. Si todo está claro, avanzá directamente
con el plan de implementación.
