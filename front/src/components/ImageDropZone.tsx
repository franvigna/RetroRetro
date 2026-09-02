import { useId, useRef, useState } from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

interface ImageDropZoneProps {
  onImageReady: (payload: { file: File; bitmap: ImageBitmap }) => void;
  onError: (message: string) => void;
}

// Input de archivo + drag&drop para Avatar Lab. Valida el archivo y entrega
// un ImageBitmap ya listo para el pipeline — nadie más en la app necesita
// leer un archivo local a imagen, así que esa conversión vive acá y no en
// la página.
export function ImageDropZone({ onImageReady, onError }: ImageDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;

    if (/\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif") {
      onError("Ese formato (HEIC/HEIF) no se puede leer en el navegador. Usá JPG, PNG o WebP.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError("Formato no soportado. Usá JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError("La imagen pesa demasiado (máximo 15MB).");
      return;
    }

    try {
      // "from-image" corrige la orientación EXIF de fotos de celular: sin
      // esto, una foto vertical puede llegar rotada 90°.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      onImageReady({ file, bitmap });
    } catch {
      onError("No se pudo leer la imagen. Probá con otro archivo.");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="field">
      <label htmlFor={inputId}>Foto de origen</label>
      <div
        className="image-drop-zone"
        data-dragging={String(isDragging)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>Arrastrá una foto acá o hacé click para elegirla</p>
        <span className="field-help">JPG, PNG o WebP — máx. 15MB</span>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        className="sr-only"
      />
    </div>
  );
}
