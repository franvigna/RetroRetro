import { forwardRef } from "react";

// Header de estrellas disponibles (HU-F08b): reemplaza el párrafo de texto
// "Te quedan X de N estrellas" por una fila de íconos. Los primeros
// `remaining` están llenos (disponibles), el resto vacíos/atenuados (ya
// usados). Solo se muestra durante grouping_voting.
//
// El ref apunta al contenedor de la fila de estrellas: ActivePhasePage lo usa
// para medir su posición y animar la "estrella voladora" hacia/desde una
// tarjeta cuando se vota/desvota (ver FlyingStar.jsx).
export const StarsHeader = forwardRef(function StarsHeader({ total, remaining }, ref) {
  const used = Math.max(0, total - remaining);

  return (
    <div className="stars-header">
      <p className="stars-header-label">Estrellas de puntaje disponibles</p>
      <div className="stars-header-row" ref={ref} aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className="stars-header-icon" data-used={String(i < used)}>
            {i < used ? "☆" : "★"}
          </span>
        ))}
      </div>
      <p className="sr-only" role="status">
        Te quedan {remaining} de {total} estrellas para repartir.
      </p>
    </div>
  );
});
