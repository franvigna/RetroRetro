import { CONNECTION_STATUS } from "../context/RoomContext.jsx";

const MESSAGES = {
  [CONNECTION_STATUS.CONNECTING]: "Cargando nivel... conectando con el servidor.",
  [CONNECTION_STATUS.DISCONNECTED]: "Conexión perdida. Intentando reconectar...",
  [CONNECTION_STATUS.CONNECTED]: "Conectado.",
  [CONNECTION_STATUS.SERVER_FULL]: "El servidor está al tope de su capacidad. Probá de nuevo en unos minutos.",
};

// Feedback visual de los 3 estados de conexión (HU-F11). El backend en Render
// puede tardar en despertar (cold start) — este banner evita que la persona
// usuaria piense que la app está rota.
export function ConnectionBanner({ status }) {
  return (
    <div className="connection-banner" data-status={status} role="status">
      {MESSAGES[status]}
    </div>
  );
}
