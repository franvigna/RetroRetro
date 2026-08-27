import { useRoom } from "../context/RoomContext.jsx";

// Wrapper fino sobre el contexto para que los componentes que solo necesitan
// el estado de conexión no tengan que importar todo useRoom().
export function useConnectionStatus() {
  const { connectionStatus } = useRoom();
  return connectionStatus;
}
