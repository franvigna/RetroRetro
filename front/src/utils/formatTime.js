// Formatea segundos restantes a "mm:ss". Negativos o no numéricos se tratan como 0.
export function formatTime(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Formatea un total de minutos como "Xh Ym" (u "Xh"/"Ym" cuando falta una parte).
export function formatMinutesAsHours(totalMinutes) {
  const safeMinutes = Number.isFinite(totalMinutes) && totalMinutes > 0 ? Math.floor(totalMinutes) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

// Formatea una fecha como "DD/MM/AAAA" a mano (en vez de toLocaleDateString,
// cuyo resultado depende del locale/ICU del entorno donde corre) — para que
// el PDF exportado (ver domain/exportPdf.js) se vea igual sin importar el
// navegador o el sistema operativo de quien lo genera.
export function formatDateShort(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
