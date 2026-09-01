const PHASE_LABEL_FRAGMENTS = {
  welcome: "Cómo jugar",
  previous_action: "puntaje anterior",
  keep_improve_try: "Keep, Improve, Try",
  expression_round: "Turno de jugador",
  grouping_voting: "Ranking de estrellas",
  hall_of_fame: "Salón de la Fama",
  action_plan: "Guardar partida",
};

export async function createRoomAsHost(page, { hostName, durations = {}, starsPerParticipant, secondsPerSpeaker } = {}) {
  await page.goto("/create");
  await page.getByLabel("Tu nombre").fill(hostName);
  await page.getByRole("button", { name: "Cisco", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente ▶" }).click();

  for (const [phase, minutes] of Object.entries(durations)) {
    const fragment = PHASE_LABEL_FRAGMENTS[phase];
    const field = page.locator(".field", { hasText: fragment });
    await field.locator("input[type=number]").fill(String(minutes));
  }
  if (secondsPerSpeaker !== undefined) {
    const field = page.locator(".field", { hasText: PHASE_LABEL_FRAGMENTS.expression_round });
    await field.locator("input[type=number]").fill(String(secondsPerSpeaker));
  }
  await page.getByRole("button", { name: "Siguiente ▶" }).click();

  if (starsPerParticipant !== undefined) {
    await page.getByLabel("Estrellas de puntaje por participante").fill(String(starsPerParticipant));
  }

  await page.getByRole("button", { name: "Crear sala ▶" }).click();
  await page.waitForURL(/\/room\/RETRO-/);
  const code = page.url().split("/room/")[1];
  return code;
}

export async function joinRoomAsParticipant(page, { code, name }) {
  await page.goto("/join");
  await page.getByLabel("Código de sala").fill(code);
  await page.getByRole("button", { name: "Siguiente ▶" }).click();
  await page.getByLabel("Tu nombre").fill(name);
  await page.getByRole("button", { name: "Licha", exact: true }).click();
  await page.getByRole("button", { name: "▶ Entrar" }).click();
  await page.waitForURL(`**/room/${code}`);
}

export async function advancePhase(hostPage) {
  await hostPage.getByRole("button", { name: "Siguiente nivel ▶" }).click();
}

// Nivel 4: el host toca a un participante para marcarlo como orador actual
// (o para des-marcarlo si ya era el orador — toggle, ver SpeakerList.jsx).
export async function setSpeaker(hostPage, name) {
  await hostPage.getByRole("button", { name }).click();
}

export async function addActionPlanCard(page, { text, assigneeLabel }) {
  await page.getByLabel("Acción concreta").fill(text);
  if (assigneeLabel) {
    await page.getByLabel("Responsables").click();
    await page.getByLabel(assigneeLabel).check();
  }
  await page.getByRole("button", { name: "Agregar" }).click();
}
