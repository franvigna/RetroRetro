import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext.jsx";
import { WaitingRoomPage } from "./WaitingRoomPage.jsx";
import { ActivePhasePage } from "./ActivePhasePage.jsx";
import { ClosingPage } from "./ClosingPage.jsx";

// Punto de entrada de la ruta /room/:code. Si el contexto todavía no tiene el
// room cargado (ej. refresh duro de página), RoomContext ya reintenta
// room:join solo con la identidad guardada en sessionStorage (HU-F13) — acá
// solo mostramos un estado de "conectando" mientras eso resuelve, y recién le
// pedimos el nombre a mano si no hay identidad guardada para recuperar.
export function RoomPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const {
    room,
    joinRoom,
    roomNotFoundCode,
    clearRoomNotFound,
    roomLockedCode,
    clearRoomLocked,
    pendingRejoin,
    pendingRejoinName,
  } = useRoom();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const roomMatchesUrl = room && room.code === code;

  if (!roomMatchesUrl) {
    // El rechazo debe ganar sobre `pendingRejoin`: la identidad sigue en
    // sessionStorage cuando el token ya expiró, así que priorizar el estado
    // pendiente dejaría la pantalla en "RECONECTANDO" para siempre.
    if (roomLockedCode === code) {
      return (
        <div className="page page-narrow">
          <h1 className="brand-title pixel-text">SALA CERRADA</h1>
          <div className="cabinet">
            <div className="cabinet-bezel" />
            <p className="cabinet-subtitle">
              La partida en <strong>{code}</strong> ya empezó. Solo puede volver a entrar quien ya
              estaba adentro — pedile al anfitrión que te comparta un lugar si te sumaste tarde.
            </p>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate("/")}>
              ◀ Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    if (pendingRejoin) {
      return (
        <div className="page page-narrow">
          <h1 className="brand-title pixel-text">RECONECTANDO</h1>
          <div className="cabinet">
            <div className="cabinet-bezel" />
            <p className="cabinet-subtitle">
              Recuperando tu lugar en la sala <strong>{code}</strong> como {pendingRejoinName}...
            </p>
          </div>
        </div>
      );
    }

    function handleSubmit(e) {
      e.preventDefault();
      setTouched(true);
      if (!name.trim()) return;
      clearRoomNotFound();
      clearRoomLocked();
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
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: "0.75rem" }}
            onClick={() => navigate("/")}
          >
            ◀ Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (room.phase === "waiting_room") return <WaitingRoomPage />;
  if (room.phase === "closing") return <ClosingPage />;
  return <ActivePhasePage />;
}
