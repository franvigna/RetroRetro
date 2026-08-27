import { useState } from "react";
import { useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext.jsx";
import { WaitingRoomPage } from "./WaitingRoomPage.jsx";
import { ActivePhasePage } from "./ActivePhasePage.jsx";
import { ClosingPage } from "./ClosingPage.jsx";

// Punto de entrada de la ruta /room/:code. Nunca persiste nada en Storage:
// si el contexto todavía no tiene el room cargado (ej. refresh duro de
// página), le vuelve a pedir el nombre a la persona usuaria y reintenta
// room:join con el code de la URL (ver shared-contract.md sección 4).
export function RoomPage() {
  const { code } = useParams();
  const { room, joinRoom, roomNotFoundCode, clearRoomNotFound } = useRoom();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const roomMatchesUrl = room && room.code === code;

  if (!roomMatchesUrl) {
    function handleSubmit(e) {
      e.preventDefault();
      setTouched(true);
      if (!name.trim()) return;
      clearRoomNotFound();
      joinRoom(code, name.trim());
    }

    return (
      <div className="page page-narrow">
        <h1 className="brand-title pixel-text">RECONECTAR</h1>
        <div className="cabinet">
          <div className="cabinet-bezel" />
          <p className="cabinet-subtitle">
            Sala <strong>{code}</strong>. Ingresá tu nombre para volver a entrar.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="reconnectName">Tu nombre</label>
              <input
                id="reconnectName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Ana"
              />
              {touched && !name.trim() && <span className="field-error">Ingresá tu nombre.</span>}
            </div>
            {roomNotFoundCode && (
              <p className="error-banner">La sala {roomNotFoundCode} no existe o ya cerró.</p>
            )}
            <button type="submit" className="btn btn-primary btn-block">
              ▶ Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (room.phase === "waiting_room") return <WaitingRoomPage />;
  if (room.phase === "closing") return <ClosingPage />;
  return <ActivePhasePage />;
}
