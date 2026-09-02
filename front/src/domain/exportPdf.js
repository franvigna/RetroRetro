import { jsPDF } from "jspdf";
import { ARCADE_COLORS } from "./arcadePalette.js";
import { formatDateShort } from "../utils/formatTime.js";
import { getAvatarById } from "./avatars.js";

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

function drawAvatar(doc, avatarId, x, y, size = 18) {
  const avatar = getAvatarById(avatarId);
  if (!avatar?.src) return false;
  try {
    doc.addImage(avatar.src, "PNG", x, y, size, size);
    return true;
  } catch {
    // Si un entorno de test no transforma el asset a data URL, el PDF sigue
    // siendo válido; en el build de Vite estos sprites pequeños van inline.
    return false;
  }
}

function drawPageFooter(doc, pageWidth, pageHeight) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...ARCADE_COLORS.textFaint);
  doc.text("RETRORETRO • TABLERO DE COMPROMISOS", MARGIN_X, pageHeight - 22);
  doc.text(`PÁGINA ${doc.getNumberOfPages()}`, pageWidth - MARGIN_X, pageHeight - 22, { align: "right" });
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
  const actionCards = room.cards.filter((c) => c.column === "action_plan");
  const participantsById = Object.fromEntries(room.participants.map((p) => [p.id, p]));

  fillPageBackground(doc, pageWidth, pageHeight);
  drawBezelStripe(doc, pageWidth);

  let y = STRIPE_HEIGHT + 38;

  if (room.teamName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ARCADE_COLORS.textDim);
    doc.text(`Retro del equipo "${room.teamName}"`, MARGIN_X, y);
    y += 20;
  }

  // Cabecera de tablero: el documento debe leerse primero como un plan de
  // acción y no como una captura de la pantalla de cierre.
  doc.setFillColor(...ARCADE_COLORS.panel);
  doc.roundedRect(MARGIN_X, y - 18, pageWidth - MARGIN_X * 2, 68, 5, 5, "F");
  doc.setFillColor(...ARCADE_COLORS.cyan);
  doc.rect(MARGIN_X, y - 18, 5, 68, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ARCADE_COLORS.cyan);
  doc.text("PLAN DE ACCIÓN", MARGIN_X + 20, y + 5);

  y += 23;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...ARCADE_COLORS.textDim);
  doc.text("Compromisos concretos acordados por el equipo", MARGIN_X + 20, y);

  y += 45;
  doc.setFontSize(10);
  doc.setTextColor(...ARCADE_COLORS.text);
  const metaLines = [
    `Sala: ${room.code}`,
    `Fecha: ${formatDateShort(now)}`,
    `Anfitrión: ${host?.name ?? "—"}`,
  ];
  for (const line of metaLines) {
    doc.text(line, MARGIN_X, y);
    y += 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ARCADE_COLORS.textDim);
  doc.text("EQUIPO", MARGIN_X, y);
  y += 10;
  let participantX = MARGIN_X;
  for (const participant of room.participants) {
    const avatarSize = 20;
    const labelWidth = doc.getTextWidth(participant.name) + 34;
    if (participantX + labelWidth > pageWidth - MARGIN_X) {
      participantX = MARGIN_X;
      y += 28;
    }
    doc.setFillColor(...ARCADE_COLORS.panel);
    doc.roundedRect(participantX, y, labelWidth, 24, 3, 3, "F");
    drawAvatar(doc, participant.avatarId, participantX + 3, y + 2, avatarSize);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...ARCADE_COLORS.text);
    doc.text(participant.name, participantX + 27, y + 15);
    participantX += labelWidth + 7;
  }
  if (room.participants.length > 0) y += 28;

  y += 10;
  doc.setDrawColor(...ARCADE_COLORS.border);
  doc.setLineWidth(1);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);

  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ARCADE_COLORS.cyan);
  doc.text("COMPROMISOS DEL EQUIPO", MARGIN_X, y);
  y += 24;

  if (actionCards.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...ARCADE_COLORS.textFaint);
    doc.text("No se guardaron acciones en esta partida.", MARGIN_X, y);
    drawPageFooter(doc, pageWidth, pageHeight);
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

    const topPadding = 14;
    const bottomPadding = 10;
    const assigneeRowHeight = assigneeNames.length > 0 ? 24 : lineHeight;
    const blockHeight = topPadding + textLines.length * lineHeight + assigneeRowHeight + bottomPadding;

    if (y + blockHeight > pageHeight - BOTTOM_MARGIN) {
      doc.addPage();
      fillPageBackground(doc, pageWidth, pageHeight);
      drawBezelStripe(doc, pageWidth);
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

    if (assigneeNames.length > 0) {
      let assigneeX = MARGIN_X + 16;
      for (const assigneeId of card.assigneeIds || []) {
        const participant = participantsById[assigneeId];
        drawAvatar(doc, participant?.avatarId, assigneeX, cardY - 3, 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...ARCADE_COLORS.cyan);
        doc.text(participant?.name || "?", assigneeX + 20, cardY + 8);
        assigneeX += doc.getTextWidth(participant?.name || "?") + 34;
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...ARCADE_COLORS.textFaint);
      doc.text(assigneeText, MARGIN_X + 16, cardY);
    }

    y += blockHeight + 14;
  }

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    drawPageFooter(doc, pageWidth, pageHeight);
  }

  return doc;
}
