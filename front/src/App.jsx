import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { RoomProvider, useRoom } from "./context/RoomContext.jsx";
import { ConnectionBanner } from "./components/ConnectionBanner.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { CreateRoomPage } from "./pages/CreateRoomPage.jsx";
import { JoinRoomPage } from "./pages/JoinRoomPage.jsx";
import { RoomPage } from "./pages/RoomPage.jsx";

// Avatar Lab es una herramienta interna (generador de avatares pixel-art
// desde una foto, ver front/src/pages/AvatarLabPage.jsx) — no forma parte del
// flujo de sala. Se carga lazy y detrás de un flag para que ni el código ni
// sus dependencias (MediaPipe) lleguen al bundle de un participante en prod.
const AvatarLabPage = lazy(() => import("./pages/AvatarLabPage.jsx").then((m) => ({ default: m.AvatarLabPage })));
const DEV_TOOLS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

function AppShell() {
  const { connectionStatus, roomClosed, clearRoomClosed } = useRoom();
  const navigate = useNavigate();

  // El host cerró la sala desde el panel de configuración (room:close) —
  // saca a todos, incluido el propio host, de vuelta al inicio (ver
  // RoomContext.jsx, handleRoomClosed).
  useEffect(() => {
    if (roomClosed) {
      navigate("/");
    }
  }, [roomClosed, navigate]);

  return (
    <>
      <ConnectionBanner status={connectionStatus} />
      {roomClosed && (
        <div className="room-closed-banner" role="status">
          El anfitrión cerró la sala.
          <button type="button" className="card-item-action-btn" aria-label="Cerrar aviso" onClick={clearRoomClosed}>
            ✕
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/join/:code" element={<JoinRoomPage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        {DEV_TOOLS_ENABLED && (
          <Route
            path="/dev/avatar-lab"
            element={
              <Suspense fallback={<div className="page page-narrow"><p className="pixel-text">CARGANDO…</p></div>}>
                <AvatarLabPage />
              </Suspense>
            }
          />
        )}
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <AppShell />
      </RoomProvider>
    </BrowserRouter>
  );
}
