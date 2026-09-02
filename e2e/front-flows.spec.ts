import { test, expect } from "@playwright/test";
import { io as ioClient } from "socket.io-client";
import { createRoomAsHost, joinRoomAsParticipant, advancePhase, addActionPlanCard } from "./helpers.js";

test("E2E-F01: crear sala muestra el código y queda en Insertar moneda como host", async ({ page }) => {
  const code = await createRoomAsHost(page, { hostName: "Cisco" });
  await expect(page.getByText("INSERTAR MONEDA")).toBeVisible();
  await expect(page.getByText(code)).toBeVisible();
});

test("E2E-F02: un segundo usuario se une (código en paso 1, nombre en paso 2) y aparece en la lista del primero en tiempo real", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await expect(hostPage.getByText("Ana")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F02b: el link de invitación copiado lleva directo al paso 2 (nombre) con el código precargado", async ({ browser }) => {
  const hostContext = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  await hostPage.getByRole("button", { name: /Copiar link para invitar/ }).click();
  await expect(hostPage.getByRole("button", { name: "¡Copiado!" })).toBeVisible();
  const inviteUrl = await hostPage.evaluate(() => navigator.clipboard.readText());
  expect(inviteUrl).toContain(`/join/${code}`);

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await participantPage.goto(inviteUrl);

  // El paso 1 (código) se saltea: va directo al paso 2 con el código de la URL.
  await expect(participantPage.getByLabel("Código de sala")).not.toBeVisible();
  await participantPage.getByLabel("Tu nombre").fill("Ana");
  await participantPage.getByRole("button", { name: "Licha", exact: true }).click();
  await participantPage.getByRole("button", { name: "▶ Entrar" }).click();
  await participantPage.waitForURL(`**/room/${code}`);

  await expect(hostPage.getByText("Ana")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F03: el host inicia la partida y ambos ven el Nivel 1 al mismo tiempo", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();

  await expect(hostPage.getByText("Cómo jugar")).toBeVisible();
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F04: el host avanza de nivel y el participante ve el cambio sin recargar", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  await advancePhase(hostPage);

  await expect(participantPage.getByText("puntaje anterior")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F05: un participante agrega una tarjeta en keep_improve_try; el host la ve recién al avanzar de fase", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage);
  await advancePhase(hostPage);
  await expect(participantPage.locator(".brand-tagline").getByText("Keep, Improve, Try")).toBeVisible();

  await participantPage.getByLabel("Nueva tarjeta").first().fill("Buen pair programming");
  await participantPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(participantPage.getByText("Buen pair programming")).toBeVisible();

  // HU-F09b: mientras keep_improve_try sigue activa, el host no ve la tarjeta de Ana.
  await expect(hostPage.getByText("Buen pair programming")).toHaveCount(0);

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting: recién ahí se revela para todos
  await expect(hostPage.getByText("Buen pair programming")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F09b: cada participante ve solo sus propias tarjetas en keep_improve_try hasta que el host avanza", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try

  await hostPage.getByLabel("Nueva tarjeta").first().fill("Tarjeta del host");
  await hostPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(hostPage.getByText("Tarjeta del host")).toBeVisible();

  await participantPage.getByLabel("Nueva tarjeta").first().fill("Tarjeta de Ana");
  await participantPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(participantPage.getByText("Tarjeta de Ana")).toBeVisible();

  // Ninguno ve la tarjeta ajena todavía.
  await expect(hostPage.getByText("Tarjeta de Ana")).toHaveCount(0);
  await expect(participantPage.getByText("Tarjeta del host")).toHaveCount(0);

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting: revela todo para todos

  await expect(hostPage.getByText("Tarjeta de Ana")).toBeVisible();
  await expect(hostPage.getByText("Tarjeta del host")).toBeVisible();
  await expect(participantPage.getByText("Tarjeta de Ana")).toBeVisible();
  await expect(participantPage.getByText("Tarjeta del host")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F09c: el autor puede editar (lápiz) y eliminar (X) su propia tarjeta; nadie más puede", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try

  await hostPage.getByLabel("Nueva tarjeta").first().fill("Texto original");
  await hostPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(hostPage.getByText("Texto original")).toBeVisible();

  // Mientras Ana no ve la tarjeta del host (HU-F09b), tampoco tiene forma de
  // editarla ni eliminarla: los controles ni siquiera están en su DOM.
  await expect(participantPage.getByLabel("Editar tarjeta")).toHaveCount(0);
  await expect(participantPage.getByLabel("Eliminar tarjeta")).toHaveCount(0);

  await hostPage.getByLabel("Editar tarjeta").click();
  await hostPage.getByLabel("Editar tarjeta").fill("Texto corregido");
  await hostPage.getByRole("button", { name: "Guardar" }).click();
  await expect(hostPage.getByText("Texto corregido")).toBeVisible();

  await hostPage.getByLabel("Eliminar tarjeta").click();
  await hostPage.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(hostPage.getByText("Texto corregido")).toHaveCount(0);

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F06: dar y retirar una estrella se refleja para todos", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await expect(participantPage.locator(".brand-tagline").getByText("Keep, Improve, Try")).toBeVisible();

  await participantPage.getByLabel("Nueva tarjeta").first().fill("Algo importante");
  await participantPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(participantPage.getByText("Algo importante")).toBeVisible();

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting: revela la tarjeta de Ana al host
  await expect(hostPage.getByText("Algo importante")).toBeVisible();
  await expect(participantPage.getByText("Ranking de estrellas")).toBeVisible();

  const voteButton = participantPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first();
  await voteButton.click();
  await expect(participantPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();

  // El voto del participante llegó al estado compartido: el host puede votar la misma card
  // (su propio voto es independiente del de Ana) y ver su botón cambiar de estado.
  const hostVoteButton = hostPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first();
  await hostVoteButton.click();
  await expect(hostPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();
  await expect(participantPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();
  await hostPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first().click();

  await participantPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first().click();
  await expect(participantPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first()).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F07: unirse con código inexistente muestra error claro y vuelve al paso 1", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Código de sala").fill("RETRO-ZZZZ");
  await page.getByRole("button", { name: "Siguiente ▶" }).click();
  await page.getByLabel("Tu nombre").fill("Nadie");
  await page.getByRole("button", { name: "Licha", exact: true }).click();
  await page.getByRole("button", { name: "▶ Entrar" }).click();

  await expect(page.getByText(/No encontramos ninguna sala/)).toBeVisible();
  await expect(page).toHaveURL(/\/join/);
  await expect(page.getByLabel("Código de sala")).toBeVisible();
});

test("E2E-F08: un participante sin controles de host no puede avanzar de fase vía manipulación directa", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  // El cliente de prueba tiene que obtener una identidad antes de que la
  // sala se bloquee a ingresos nuevos; luego intenta escalar privilegios.
  const rogueSocket = ioClient("http://localhost:3000", { transports: ["websocket"] });
  await new Promise<void>((resolve) => rogueSocket.on("connect", () => resolve()));
  rogueSocket.emit("room:join", { code, name: "Intruso" });
  await new Promise<void>((resolve) => rogueSocket.once("room:state", () => resolve()));

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  // La UI del participante nunca muestra el control (mejora de UX, no la seguridad real).
  await expect(participantPage.getByRole("button", { name: "Siguiente nivel ▶" })).toHaveCount(0);

  // Manipulación directa: el cliente separado intenta el evento reservado a host.
  const unauthorizedPromise = new Promise<{ action: string }>((resolve) =>
    rogueSocket.once("error:unauthorized", (payload: { action: string }) => resolve(payload))
  );
  rogueSocket.emit("phase:advance");
  const error = await unauthorizedPromise;

  expect(error.action).toBe("phase:advance");
  await expect(hostPage.getByText("Cómo jugar")).toBeVisible();
  rogueSocket.disconnect();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F09: Turno de jugador — el host marca y limpia orador, visible para el participante", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await advancePhase(hostPage); // expression_round
  await expect(participantPage.locator(".brand-tagline").getByText("Turno de jugador")).toBeVisible();

  await hostPage.getByRole("button", { name: "Ana" }).click();
  await expect(participantPage.locator('[data-speaking="true"]', { hasText: "Ana" })).toBeVisible();

  // El participante no tiene ningún control: es un rol de solo lectura.
  await expect(participantPage.getByRole("button", { name: "Ana" })).toHaveCount(0);

  await hostPage.getByRole("button", { name: "Ana" }).click();
  await expect(participantPage.locator('[data-speaking="true"]')).toHaveCount(0);

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F09d: expression_round no muestra timer tradicional ni +5min/-5min, y sí el mini-timer del orador", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco", secondsPerSpeaker: 90 });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await advancePhase(hostPage); // expression_round

  await expect(hostPage.getByRole("timer")).toHaveCount(0);
  await expect(hostPage.getByText(/\+5 min/)).toHaveCount(0);
  await expect(hostPage.getByText(/-5 min/)).toHaveCount(0);

  await hostPage.getByRole("button", { name: "Ana" }).click();
  await expect(hostPage.getByText("01:30")).toBeVisible();
});

test("E2E-F09e: host puede saltar de orador a mitad de turno sin esperar la rotación automática", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco", secondsPerSpeaker: 90 });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await advancePhase(hostPage); // expression_round

  await hostPage.getByRole("button", { name: "Cisco" }).click();
  await expect(hostPage.locator('[data-speaking="true"]', { hasText: "Cisco" })).toBeVisible();

  // Salta directo a Ana sin esperar a que termine el turno del host.
  await hostPage.getByRole("button", { name: "Ana" }).click();
  await expect(hostPage.locator('[data-speaking="true"]', { hasText: "Ana" })).toBeVisible();
  await expect(participantPage.locator('[data-speaking="true"]', { hasText: "Ana" })).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F10: Salón de la Fama muestra automáticamente la tarjeta más votada, sin configuración previa del host", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await hostPage.getByLabel("Nueva tarjeta").first().fill("La tarjeta ganadora");
  await hostPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(hostPage.getByText("La tarjeta ganadora")).toBeVisible();

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting: se revela para Ana
  await expect(participantPage.getByText("La tarjeta ganadora")).toBeVisible();
  await hostPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first().click();

  await advancePhase(hostPage); // hall_of_fame
  await expect(hostPage.locator(".brand-tagline").getByText("Salón de la Fama")).toBeVisible();
  await expect(hostPage.getByText("La tarjeta ganadora")).toBeVisible();
  await expect(participantPage.getByText("La tarjeta ganadora")).toBeVisible();
  await expect(hostPage.getByText("1º")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-F11: flujo completo de punta a punta hasta Game Over, con action_plan (acción concreta + responsables)", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await expect(hostPage.locator(".brand-tagline").getByText("Keep, Improve, Try")).toBeVisible();

  await participantPage.getByLabel("Nueva tarjeta").first().fill("Buena comunicación");
  await participantPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(participantPage.getByText("Buena comunicación")).toBeVisible();

  await advancePhase(hostPage); // expression_round
  await hostPage.getByRole("button", { name: "Ana" }).click();
  await expect(participantPage.locator('[data-speaking="true"]', { hasText: "Ana" })).toBeVisible();

  await advancePhase(hostPage); // grouping_voting: se revela para el host
  await expect(hostPage.getByText("Buena comunicación")).toBeVisible();
  await expect(hostPage.getByText("Ranking de estrellas")).toBeVisible();
  await hostPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first().click();

  await advancePhase(hostPage); // hall_of_fame
  await expect(hostPage.getByText("Buena comunicación")).toBeVisible();

  await advancePhase(hostPage); // action_plan
  await expect(hostPage.locator(".brand-tagline").getByText("Guardar partida")).toBeVisible();
  await addActionPlanCard(hostPage, {
    text: "Hacer retro de arquitectura la próxima semana",
    assigneeLabel: "Ana",
  });
  await expect(hostPage.getByText("Hacer retro de arquitectura la próxima semana")).toBeVisible();
  await expect(hostPage.locator(".card-item", { hasText: "Responsables:" }).getByText("Ana", { exact: true })).toBeVisible();

  await advancePhase(hostPage); // closing

  await expect(hostPage.getByText("GAME OVER")).toBeVisible();
  await expect(hostPage.getByText("Hacer retro de arquitectura la próxima semana")).toBeVisible();
  await expect(participantPage.getByText("GAME OVER")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});
