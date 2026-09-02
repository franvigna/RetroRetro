import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Durante la migración incremental a TypeScript (ver plan de fases), muchos
// archivos ".jsx"/".js" que todavía no se convirtieron importan a otros que
// ya pasaron a ".ts"/".tsx" usando la extensión ".js" en el import — es la
// convención estándar de import "relativo con extensión" que ya usaba todo
// el proyecto. Vite solo aplica el fallback ".js" → ".ts" automáticamente
// cuando quien importa ya es un archivo TypeScript; este plugin lo extiende
// para que también funcione desde ".jsx"/".js" — sin esto, cualquier
// archivo aún no migrado que importe algo ya migrado rompe en dev y en tests.
function resolveTsFromJsImports(): Plugin {
  return {
    name: "resolve-ts-from-js-imports",
    async resolveId(source, importer, options) {
      if (!/\.jsx?$/.test(source) || !importer) return null;
      const tsCandidate = source.replace(/\.jsx?$/, (ext) => (ext === ".jsx" ? ".tsx" : ".ts"));
      return this.resolve(tsCandidate, importer, { ...options, skipSelf: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), resolveTsFromJsImports()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
  },
});
