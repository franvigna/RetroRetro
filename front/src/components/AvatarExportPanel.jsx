import { useId, useMemo, useState } from "react";

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCamelCase(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function rasterToCanvas(raster) {
  const canvas = document.createElement("canvas");
  canvas.width = raster.width;
  canvas.height = raster.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0);
  return canvas;
}

function isClipboardImageSupported() {
  return typeof window !== "undefined" && typeof window.ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);
}

// Baja el PNG y arma el snippet para pegar en avatars.js. El pegado a
// avatars.js queda manual a propósito (no escribe en el repo) — mismo flujo
// que se usó para sumar los 48 avatares actuales, solo que ahora el sprite
// se generó adentro en vez de conseguirse afuera.
export function AvatarExportPanel({ raster, disabled = false }) {
  const nameId = useId();
  const [rawName, setRawName] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");

  const slug = useMemo(() => {
    const cleaned = slugify(rawName);
    if (!cleaned) return "";
    return cleaned.startsWith("avatar-") ? cleaned : `avatar-${cleaned}`;
  }, [rawName]);

  const snippet = useMemo(() => {
    if (!slug) return "";
    const id = slug.replace(/^avatar-/, "");
    const varName = toCamelCase(id);
    return [
      `import ${varName} from "../assets/sprites/${slug}.png";`,
      "",
      `{ id: "${id}", label: "${rawName.trim() || id}", src: ${varName} },`,
    ].join("\n");
  }, [slug, rawName]);

  function handleDownload() {
    if (!raster) return;
    const canvas = rasterToCanvas(raster);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug || "avatar-nuevo"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function handleCopyImage() {
    if (!raster) return;
    const canvas = rasterToCanvas(raster);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
        setCopyStatus("copied");
      } catch {
        setCopyStatus("error");
      }
    }, "image/png");
  }

  async function handleCopySnippet() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  const exportDisabled = disabled || !raster;

  return (
    <div className="avatar-export-panel">
      <div className="field">
        <label htmlFor={nameId}>Nombre del personaje</label>
        <input
          id={nameId}
          type="text"
          value={rawName}
          onChange={(e) => setRawName(e.target.value)}
          placeholder="Ej: Foto de Cisco"
        />
        {slug && <span className="field-help">Archivo: {slug}.png</span>}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={exportDisabled}>
          Descargar PNG
        </button>
        {isClipboardImageSupported() && (
          <button type="button" className="btn btn-ghost" onClick={handleCopyImage} disabled={exportDisabled}>
            Copiar imagen
          </button>
        )}
      </div>

      {snippet && (
        <div className="field">
          <label>Para pegar en avatars.js</label>
          <pre className="avatar-export-snippet">{snippet}</pre>
          <button type="button" className="btn btn-ghost" onClick={handleCopySnippet} disabled={exportDisabled}>
            Copiar snippet
          </button>
        </div>
      )}

      {copyStatus === "copied" && (
        <span className="field-help" role="status">
          Copiado ✓
        </span>
      )}
      {copyStatus === "error" && (
        <span className="field-error" role="status">
          No se pudo copiar — probá descargar en su lugar.
        </span>
      )}
    </div>
  );
}
