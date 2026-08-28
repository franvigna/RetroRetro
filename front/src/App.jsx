import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoomProvider, useRoom } from "./context/RoomContext.jsx";
import { ConnectionBanner } from "./components/ConnectionBanner.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { CreateRoomPage } from "./pages/CreateRoomPage.jsx";
import { JoinRoomPage } from "./pages/JoinRoomPage.jsx";
import { RoomPage } from "./pages/RoomPage.jsx";

function AppShell() {
  const { connectionStatus } = useRoom();
  return (
    <>
      <ConnectionBanner status={connectionStatus} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/join/:code" element={<JoinRoomPage />} />
        <Route path="/room/:code" element={<RoomPage />} />
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
