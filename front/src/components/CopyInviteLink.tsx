import { useState } from "react";

const COPIED_LABEL_MS = 2000;

// Arma el link de invitación directo al paso 2 de "Unirse a sala" (nombre +
// avatar), saltando el paso 1 (código) porque ya viaja en la URL.
export function buildInviteUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

export function CopyInviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = buildInviteUrl(code);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("clipboard API no disponible");
      }
    } catch {
      // Fallback para navegadores/contextos sin Clipboard API (ej: sin HTTPS).
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_LABEL_MS);
  }

  return (
    <button type="button" className="btn btn-secondary btn-block" onClick={handleCopy}>
      {copied ? "¡Copiado!" : "🔗 Copiar link para invitar"}
    </button>
  );
}
