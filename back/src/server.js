import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { PORT, CORS_ORIGIN } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { setupSocket } from "./socket/index.js";
import * as roomStore from "./rooms/roomStore.js";
import { sweepInactiveRooms } from "./rooms/cleanup.js";
import { stopTimerLoop, stopSpeakerTimerLoop } from "./socket/timerLoop.js";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(healthRouter);

const httpServer = createServer(app);
setupSocket(httpServer, CORS_ORIGIN);

setInterval(() => {
  sweepInactiveRooms({
    allCodes: roomStore.allCodes,
    get: roomStore.get,
    getLastActivity: roomStore.getLastActivity,
    remove: (code) => {
      stopTimerLoop(code);
      stopSpeakerTimerLoop(code);
      roomStore.remove(code);
    },
    now: Date.now(),
  });
}, CLEANUP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`RetroRetro backend escuchando en el puerto ${PORT}`);
});
