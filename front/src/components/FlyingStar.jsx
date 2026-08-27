import { useEffect, useState } from "react";

// Efecto visual de "la estrella viaja del header a la tarjeta" (HU-F08b).
// Recibe un rect de origen y uno de destino (DOMRect de getBoundingClientRect)
// y anima un ícono de estrella en position:fixed de uno a otro con una
// transición CSS simple. Al des-votar, quien llama pasa origen/destino
// invertidos, así que el mismo componente sirve para ambos sentidos.
//
// Respeta prefers-reduced-motion: si está activo, no monta nada (el cambio de
// estado del botón/header ya comunica el resultado sin necesidad de moverlo).
export function FlyingStar({ from, to, onDone }) {
  const [atDestination, setAtDestination] = useState(false);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      onDone();
      return;
    }
    const raf = requestAnimationFrame(() => setAtDestination(true));
    const timeout = setTimeout(onDone, 420);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (prefersReducedMotion || !from || !to) return null;

  const originX = from.left + from.width / 2;
  const originY = from.top + from.height / 2;
  const destX = to.left + to.width / 2;
  const destY = to.top + to.height / 2;

  const style = {
    left: originX,
    top: originY,
    transform: atDestination
      ? `translate(${destX - originX}px, ${destY - originY}px) scale(0.8)`
      : "translate(0, 0) scale(1.15)",
    opacity: atDestination ? 0 : 1,
  };

  return (
    <span className="flying-star" style={style} aria-hidden="true">
      ★
    </span>
  );
}
