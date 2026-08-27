# testing.md — Estrategia general de testing

Este documento complementa las secciones de testing específicas de `front.md` y `back.md` con
la estrategia general del proyecto y los escenarios de punta a punta que cruzan ambas partes.

---

## 1. Niveles de testing del proyecto

| Nivel | Dónde vive | Qué cubre | Herramienta sugerida |
|---|---|---|---|
| Unitario — backend | `back/` | Lógica pura: autorización, transición de fases, timer, votos | Vitest o Jest |
| Unitario — frontend | `front/` | Renderizado de componentes, validaciones de formularios | Vitest + React Testing Library |
| Integración — backend | `back/` | Eventos de socket reales contra un servidor levantado en memoria | Vitest/Jest + `socket.io-client` |
| End-to-end completo | Raíz del repo o carpeta `e2e/` | Flujos de usuario reales con front + back corriendo juntos | Playwright |

Se sugiere Playwright para los E2E completos porque permite abrir múltiples "browser contexts"
en paralelo dentro de un mismo test — necesario para simular host + participantes interactuando
en tiempo real en la misma sala.

---

## 2. Criterio de cobertura mínima esperado

- Toda historia de usuario listada en `front.md` y `back.md` debe tener al menos un test
  (unitario o E2E) que la cubra directamente — no alcanza con "probarlo a mano".
- Toda regla de autorización (qué puede hacer un host vs un participante) debe tener un test que
  verifique explícitamente el caso de **rechazo**, no solo el caso de éxito.
- Todo evento definido en `shared-contract.md` debe aparecer al menos una vez en un test de
  integración de backend.

---

## 3. Escenarios end-to-end completos (front + back reales)

Estos escenarios simulan una sesión real con múltiples navegadores/participantes simultáneos.

**E2E-COMPLETO-01 — Sesión feliz de punta a punta**
1. El anfitrión crea una sala definiendo una cantidad de estrellas por participante (ej: 3).
2. Dos participantes se unen con el código.
3. El anfitrión inicia la sesión.
4. Se recorre cada nivel del flujo (avanzando manualmente como host), incluyendo el Nivel 4
   (Turno de jugador) y el Nivel 6 (Salón de la Fama), que se muestra automáticamente sin
   configuración previa del host.
5. En el Nivel 3, cada participante agrega al menos una tarjeta.
6. En el Nivel 4, el host marca a cada participante como orador al menos una vez (se verifica
   que el resaltado se actualiza para todos en tiempo real).
7. En el Nivel 5, los participantes reparten sus estrellas entre tarjetas (incluyendo un caso de
   retirar una estrella ya asignada).
8. Se llega a Game Over y se verifica que el plan de acción consolidado muestre exactamente las
   tarjetas esperadas de la columna `action_plan`.

**E2E-COMPLETO-01b — Límite de estrellas respetado de punta a punta**
1. El anfitrión crea una sala con `starsPerParticipant = 2`.
2. Un participante agrega 3 tarjetas en el Nivel 3.
3. En el Nivel 5, ese mismo participante asigna sus 2 estrellas a 2 tarjetas distintas.
4. Intenta asignar una tercera estrella a la tarjeta restante — se verifica que no tiene efecto.
5. Retira una de sus 2 estrellas ya asignadas, y ahora sí logra asignarla a la tercera tarjeta —
   se verifica que en ningún momento tuvo más de 2 estrellas asignadas en simultáneo.

**E2E-COMPLETO-02 — Intento de control no autorizado**
1. Se crea una sala con un host y un participante.
2. El participante intenta, vía manipulación directa del cliente de socket (no por la UI, que ya
   oculta el botón), emitir un evento reservado a host (ej: `phase:advance`).
3. Se verifica que el estado de la sala no cambia para nadie, y que el participante recibe
   `error:unauthorized`.

**E2E-COMPLETO-03 — Reconexión durante una sesión activa**
1. Se crea una sala, se une un participante, se inicia la sesión y se avanza un par de fases.
2. El participante vota una tarjeta.
3. Se simula un corte de conexión del participante (cerrar y reabrir el socket con el mismo
   código y nombre).
4. Se verifica que el participante recupera su lugar en la sala, y que su voto previo sigue
   contando.

**E2E-COMPLETO-04 — Timer sincronizado entre múltiples clientes**
1. Se crea una sala, se unen dos participantes, se inicia la sesión.
2. Se verifica que el `remainingSeconds` recibido por ambos clientes en cada `timer:tick` sea
   siempre idéntico entre sí (nunca deberían divergir, ya que el servidor es la única fuente del
   conteo).
3. El host pausa el timer — se verifica que deja de decrecer para ambos clientes.
4. El host suma +5 minutos — se verifica que el nuevo total se refleja igual para ambos.

**E2E-COMPLETO-05 — Código de sala inválido**
1. Un usuario intenta unirse con un código que no corresponde a ninguna sala activa.
2. Se verifica que recibe `room:not_found` y que la UI se lo comunica sin romperse ni quedar en
   un estado de carga infinito.

**E2E-COMPLETO-06 — Turno de jugador controlado solo por el host**
1. Se crea una sala con un host y dos participantes, se llega al Nivel 4 (Turno de jugador).
2. El host marca al participante A como orador — ambos participantes y el host ven a A
   resaltado.
3. Un participante intenta, vía manipulación directa del cliente (no por UI), marcarse a sí
   mismo o a otro como orador — se verifica que recibe `error:unauthorized` y que el resaltado
   de A no cambia para nadie.
4. El host cambia el turno al participante B, y luego lo limpia (`turn:clear_speaker`) — se
   verifica que en cada paso todos los clientes reflejan el mismo estado sin recargar.

---

## 4. Qué hacer si un requerimiento cambia durante el desarrollo

Si al implementar algo se detecta que un requerimiento de `front.md`, `back.md` o
`shared-contract.md` estaba mal definido, ambiguo, o no contempla un caso real que aparece
durante el desarrollo:

1. No resolverlo silenciosamente en el código — señalarlo primero.
2. Proponer la actualización concreta al documento correspondiente.
3. Una vez validado, actualizar tanto el documento como el test que lo cubre, para que ambos
   sigan reflejando la misma verdad.