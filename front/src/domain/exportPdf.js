import { jsPDF } from "jspdf";
import { ARCADE_COLORS } from "./arcadePalette.js";
import { PHASE_THEMES } from "./phaseThemes.js";
import { formatDateShort } from "../utils/formatTime.js";

const MARGIN_X = 40;
const BOTTOM_MARGIN = 50;
const STRIPE_COLORS = [ARCADE_COLORS.magenta, ARCADE_COLORS.cyan, ARCADE_COLORS.yellow, ARCADE_COLORS.violet];
const STRIPE_HEIGHT = 8;
const STRIPE_SEGMENTS = 24;

// Nombre de archivo determinístico: sala + fecha (no hora, para que
// re-exportar el mismo día no genere un nombre distinto sin querer).
export function buildActionPlanFilename(room, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `retroretro-${room.code}-${y}-${m}-${d}.pdf`;
}

function fillPageBackground(doc, pageWidth, pageHeight) {
  doc.setFillColor(...ARCADE_COLORS.bg);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

function drawBezelStripe(doc, pageWidth) {
  const segmentWidth = pageWidth / STRIPE_SEGMENTS;
  for (let i = 0; i < STRIPE_SEGMENTS; i++) {
    doc.setFillColor(...STRIPE_COLORS[i % STRIPE_COLORS.length]);
    doc.rect(i * segmentWidth, 0, segmentWidth, STRIPE_HEIGHT, "F");
  }
}

// Arma el PDF del plan de acción consolidado (pantalla Game Over) con la
// estética arcade del resto de la app: mismo panel oscuro, mismo acento de
// franjas de color arriba, mismos colores por elemento (magenta para el
// borde de tarjeta, cian para "Responsables", etc. — ver theme.css).
// jsPDF construye el documento entero en memoria del lado del cliente, sin
// tocar el servidor ni ningún servicio externo.
export function generateActionPlanPdf(room, { now = new Date() } = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const host = room.participants.find((p) => p.role === "host");
  const participantNames = room.participants.map((p) => p.name).join(", ");
  const actionCards = room.cards.filter((c) => c.column === "action_plan");
  const participantsById = Object.fromEntries(room.participants.map((p) => [p.id, p]));

  fillPageBackground(doc, pageWidth, pageHeight);
  drawBezelStripe(doc, pageWidth);

  let y = STRIPE_HEIGHT + 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...ARCADE_COLORS.yellow);
  doc.text(PHASE_THEMES.closing.title, pageWidth / 2, y, { align: "center" });

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...ARCADE_COLORS.textDim);
  doc.text(PHASE_THEMES.closing.subtitle, pageWidth / 2, y, { align: "center" });

  y += 34;
  doc.setFontSize(10);
  doc.setTextColor(...ARCADE_COLORS.text);
  const metaLines = [
    `Sala: ${room.code}`,
    `Fecha: ${formatDateShort(now)}`,
    `Anfitrión: ${host?.name ?? "—"}`,
    `Participantes: ${participantNames || "—"}`,
  ];
  for (const line of metaLines) {
    doc.text(line, MARGIN_X, y);
    y += 16;
  }

  y += 10;
  doc.setDrawColor(...ARCADE_COLORS.border);
  doc.setLineWidth(1);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);

  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ARCADE_COLORS.cyan);
  doc.text("PLAN DE ACCIÓN CONSOLIDADO", MARGIN_X, y);
  y += 24;

  if (actionCards.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...ARCADE_COLORS.textFaint);
    doc.text("No se guardaron acciones en esta partida.", MARGIN_X, y);
    return doc;
  }

  const cardWidth = pageWidth - MARGIN_X * 2;
  const textWidth = cardWidth - 30;
  const lineHeight = 14;

  for (const card of actionCards) {
    const assigneeNames = (card.assigneeIds || []).map((id) => participantsById[id]?.name || "?");
    const assigneeText = assigneeNames.length > 0 ? `Responsables: ${assigneeNames.join(", ")}` : "Sin responsable asignado";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const textLines = doc.splitTextToSize(card.text, textWidth);

    const topPadding = 16;
    const bottomPadding = 10;
    const blockHeight = topPadding + textLines.length * lineHeight + lineHeight + bottomPadding;

    if (y + blockHeight > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      fillPageBackground(doc, pageWidth, pageHeight);
      y = 40;
    }

    doc.setFillColor(...ARCADE_COLORS.panel);
    doc.rect(MARGIN_X, y, cardWidth, blockHeight, "F");
    doc.setFillColor(...ARCADE_COLORS.magenta);
    doc.rect(MARGIN_X, y, 4, blockHeight, "F");

    let cardY = y + topPadding;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ARCADE_COLORS.text);
    for (const line of textLines) {
      doc.text(line, MARGIN_X + 16, cardY);
      cardY += lineHeight;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...ARCADE_COLORS.cyan);
    doc.text(assigneeText, MARGIN_X + 16, cardY);

    y += blockHeight + 14;
  }

  return doc;
}
