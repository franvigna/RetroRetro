import { test, expect } from "@playwright/test";
import { createRoomAsHost, joinRoomAsParticipant, advancePhase, addActionPlanCard } from "./helpers.js";

test("E2E-COMPLETO-01: sesión feliz de punta a punta con dos participantes", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const p1Context = await browser.newContext();
  const p1Page = await p1Context.newPage();
  await joinRoomAsParticipant(p1Page, { code, name: "Ana" });

  const p2Context = await browser.newContext();
  const p2Page = await p2Context.newPage();
  await joinRoomAsParticipant(p2Page, { code, name: "Beto" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(p1Page.getByText("Cómo jugar")).toBeVisible();
  await expect(p2Page.getByText("Cómo jugar")).toBeVisible();

  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try
  await expect(p1Page.locator(".brand-tagline").getByText("Keep, Improve, Try")).toBeVisible();

  await p1Page.getByLabel("Nueva tarjeta").first().fill("Aporte de Ana");
  await p1Page.getByRole("button", { name: "Agregar" }).first().click();
  await p2Page.getByLabel("Nueva tarjeta").nth(1).fill("Aporte de Beto");
  await p2Page.getByRole("button", { name: "Agregar" }).nth(1).click();
  // HU-F09b: mientras keep_improve_try sigue activa nadie ve las tarjetas ajenas.
  await expect(hostPage.getByText("Aporte de Ana")).toHaveCount(0);
  await expect(hostPage.getByText("Aporte de Beto")).toHaveCount(0);

  await advancePhase(hostPage); // expression_round
  await expect(p1Page.locator(".brand-tagline").getByText("Turno de jugador")).toBeVisible();
  await hostPage.getByRole("button", { name: "Beto" }).click();
  await expect(p1Page.locator('[data-speaking="true"]', { hasText: "Beto" })).toBeVisible();

  await advancePhase(hostPage); // grouping_voting
  await expect(p1Page.getByText("Ranking de estrellas")).toBeVisible();

  const anaVoteButtons = p1Page.getByRole("button", { name: "Dar tu estrella a esta tarjeta" });
  await anaVoteButtons.first().click();
  await expect(p1Page.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();
  await p1Page.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first().click();
  await expect(p1Page.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first()).toBeVisible();
  await p1Page.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first().click();

  await advancePhase(hostPage); // hall_of_fame
  await expect(hostPage.locator(".brand-tagline").getByText("Salón de la Fama")).toBeVisible();
  await expect(hostPage.getByText("Aporte de Ana")).toBeVisible();

  await advancePhase(hostPage); // action_plan
  await expect(hostPage.locator(".brand-tagline").getByText("Guardar partida")).toBeVisible();

  await addActionPlanCard(hostPage, { text: "Acción consolidada 1" });
  await expect(hostPage.getByText("Acción consolidada 1")).toBeVisible();

  await advancePhase(hostPage); // closing

  await expect(hostPage.getByText("GAME OVER")).toBeVisible();
  await expect(hostPage.getByText("Acción consolidada 1")).toBeVisible();
  await expect(hostPage.getByText("PLAN DE ACCIÓN CONSOLIDADO")).toBeVisible();

  await hostContext.close();
  await p1Context.close();
  await p2Context.close();
});

test("E2E-COMPLETO-02: intento de control no autorizado no cambia el estado de la sala", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await expect(participantPage.getByText("INSERTAR MONEDA")).toBeVisible();
  await expect(participantPage.getByRole("button", { name: "▶ Iniciar partida" })).toHaveCount(0);

  await hostContext.close();
  await participantContext.close();
});

test("E2E-COMPLETO-03: reconexión durante una sesión activa conserva el voto previo", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try

  await participantPage.getByLabel("Nueva tarjeta").first().fill("Tarjeta votada");
  await participantPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(participantPage.getByText("Tarjeta votada")).toBeVisible();

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting: se revela para el host
  await expect(hostPage.getByText("Tarjeta votada")).toBeVisible();
  await expect(participantPage.getByText("Ranking de estrellas")).toBeVisible();
  await participantPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" }).first().click();
  await expect(participantPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();

  // Simula cerrar y restaurar la misma sesión de navegador conservando la
  // credencial privada que la app guarda en sessionStorage.
  const storedIdentity = await participantPage.evaluate(() => sessionStorage.getItem("retroretro:identity"));
  await participantPage.close();
  await hostPage.waitForTimeout(500); // margen para que el servidor procese el evento disconnect
  const reconnectedPage = await participantContext.newPage();
  await reconnectedPage.addInitScript((identity) => {
    sessionStorage.setItem("retroretro:identity", identity);
  }, storedIdentity);
  await reconnectedPage.goto(`/room/${code}`);

  await expect(reconnectedPage.getByText("Ranking de estrellas")).toBeVisible();
  await expect(reconnectedPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" }).first()).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-COMPLETO-03b: un refresh de página (F5) recupera la sesión sola, sin pedir el nombre (HU-F13)", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  await participantPage.reload();

  // No debe pedir el nombre de nuevo: el auto-join usa la identidad guardada
  // en sessionStorage antes del refresh.
  await expect(participantPage.getByLabel("Tu nombre")).not.toBeVisible({ timeout: 8000 });
  await expect(participantPage.getByText("Cómo jugar")).toBeVisible();

  await hostContext.close();
  await participantContext.close();
});

test("E2E-COMPLETO-04: timer sincronizado entre múltiples clientes, pausa y +5 min", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const code = await createRoomAsHost(hostPage, { hostName: "Cisco" });

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await joinRoomAsParticipant(participantPage, { code, name: "Ana" });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(hostPage.getByText("Cómo jugar")).toBeVisible();

  await hostPage.waitForTimeout(2500);
  const hostTimerText = await hostPage.getByRole("timer").textContent();
  const participantTimerText = await participantPage.getByRole("timer").textContent();
  expect(hostTimerText.trim()).toBe(participantTimerText.trim());

  await hostPage.getByRole("button", { name: "Pausar" }).click();
  await expect(hostPage.getByRole("timer")).toContainText("PAUSA");
  const pausedText = await hostPage.getByRole("timer").textContent();
  await hostPage.waitForTimeout(2000);
  const stillPausedText = await hostPage.getByRole("timer").textContent();
  expect(stillPausedText.trim()).toBe(pausedText.trim());

  await hostPage.getByRole("button", { name: "+5 min" }).click();
  await expect(async () => {
    const current = await hostPage.getByRole("timer").textContent();
    expect(current.trim()).not.toBe(stillPausedText.trim());
  }).toPass();
  const afterAddTime = await hostPage.getByRole("timer").textContent();
  await expect(participantPage.getByRole("timer")).toHaveText(afterAddTime.trim());

  await hostContext.close();
  await participantContext.close();
});

test("E2E-COMPLETO-05: código de sala inválido no deja la UI en carga infinita", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Código de sala").fill("RETRO-9999");
  await page.getByRole("button", { name: "Siguiente ▶" }).click();
  await page.getByLabel("Tu nombre").fill("Nadie");
  await page.getByRole("button", { name: "▶ Entrar" }).click();

  await expect(page.getByText(/No encontramos ninguna sala/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByLabel("Código de sala")).toBeVisible();
});

test("phaseDurations custom se refleja en el timer real de principio a fin", async ({ page }) => {
  await createRoomAsHost(page, {
    hostName: "Cisco",
    durations: { welcome: 1 },
  });

  await page.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(page.getByText("Cómo jugar")).toBeVisible();

  await expect(page.getByRole("timer")).toContainText("00:59", { timeout: 3000 });
});

test("al llegar a 0 el timer de fase, se muestra la alarma con +5min/Continuar para el host", async ({ page }) => {
  test.setTimeout(70000);

  await createRoomAsHost(page, {
    hostName: "Cisco",
    durations: { welcome: 1 }, // 60s: el mínimo permitido por el backend
  });

  await page.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await expect(page.getByText("Cómo jugar")).toBeVisible();

  await expect(page.getByText(/TIEMPO CUMPLIDO/)).toBeVisible({ timeout: 65000 });
  await expect(page.getByRole("button", { name: /Continuar/ })).toBeVisible();

  await page.getByRole("button", { name: /Continuar/ }).click();
  await expect(page.getByText("puntaje anterior")).toBeVisible();
});

test("starsPerParticipant custom (1) limita a un solo voto activo por participante", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await createRoomAsHost(hostPage, { hostName: "Cisco", starsPerParticipant: 1 });

  await hostPage.getByRole("button", { name: "▶ Iniciar partida" }).click();
  await advancePhase(hostPage); // previous_action
  await advancePhase(hostPage); // keep_improve_try

  await hostPage.getByLabel("Nueva tarjeta").first().fill("Primera tarjeta");
  await hostPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(hostPage.getByText("Primera tarjeta")).toBeVisible();
  await hostPage.getByLabel("Nueva tarjeta").first().fill("Segunda tarjeta");
  await hostPage.getByRole("button", { name: "Agregar" }).first().click();
  await expect(hostPage.getByText("Segunda tarjeta")).toBeVisible();

  await advancePhase(hostPage); // expression_round
  await advancePhase(hostPage); // grouping_voting
  await expect(hostPage.getByText("Ranking de estrellas")).toBeVisible();

  const voteButtons = hostPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" });
  await voteButtons.first().click();
  await expect(hostPage.getByRole("button", { name: "Quitar tu estrella de esta tarjeta" })).toHaveCount(1);

  // Con solo 1 estrella disponible y ya usada, el resto de los botones de voto quedan deshabilitados.
  await expect(hostPage.getByRole("button", { name: "Dar tu estrella a esta tarjeta" })).toBeDisabled();

  await hostContext.close();
});
