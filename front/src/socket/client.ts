import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./events.js";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Instancia única compartida por toda la app. autoConnect=false: el contexto
// decide cuándo conectar (al montar la app), así los tests pueden mockear
// el módulo sin que se dispare una conexión real al importar.
export const socket: AppSocket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket"],
});
