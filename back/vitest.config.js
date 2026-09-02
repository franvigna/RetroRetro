import { defineConfig } from "vitest/config";

// Durante la migración incremental a TypeScript (ver plan de fases), muchos
// archivos ".js" que todavía no se convirtieron importan a otros que ya
// pasaron a ".ts" usando la extensión ".js" en el import — es la convención
// estándar de TS con moduleResolution NodeNext (tsc y tsx la resuelven
// solos), pero Vite/Vitest solo aplican ese fallback automáticamente cuando
// quien importa es un archivo ".ts". Este plugin extiende el mismo fallback
// para que también funcione desde archivos ".js" — sin esto, cualquier
// archivo aún no migrado que importe algo ya migrado rompe en los tests.
function resolveTsFromJsImports() {
  return {
    name: "resolve-ts-from-js-imports",
    async resolveId(source, importer, options) {
      if (!source.endsWith(".js") || !importer) return null;
      return this.resolve(source.replace(/\.js$/, ".ts"), importer, { ...options, skipSelf: true });
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJsImports()],
});
