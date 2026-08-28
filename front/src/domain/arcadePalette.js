// Espejo en RGB de los acentos definidos en front/src/styles/theme.css
// (:root, líneas 11-16). Se usa para el snap-to-theme opcional de
// pixelArt.js: acerca la paleta generada de una foto a estos colores para
// que un avatar nuevo conviva visualmente con los 48 de AVATARS.
export const ARCADE_ACCENT_RGB = [
  [255, 62, 165], // --color-magenta
  [62, 240, 255], // --color-cyan
  [255, 201, 71], // --color-yellow
  [139, 92, 246], // --color-violet
  [255, 138, 61], // --color-orange
  [255, 70, 85], // --color-red
];

// Mismos acentos, con nombre — para consumidores que necesitan un color
// puntual (ej. domain/exportPdf.js) en vez de recorrer la lista completa.
export const ARCADE_COLORS = {
  bg: [14, 10, 26], // --color-bg
  panel: [26, 19, 48], // --color-panel
  border: [58, 42, 92], // --color-border
  magenta: [255, 62, 165],
  cyan: [62, 240, 255],
  yellow: [255, 201, 71],
  violet: [139, 92, 246],
  orange: [255, 138, 61],
  red: [255, 70, 85],
  text: [242, 238, 252], // --color-text
  textDim: [179, 168, 209], // --color-text-dim
  textFaint: [122, 109, 156], // --color-text-faint
};
