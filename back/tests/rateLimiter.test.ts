import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "node:http";
import { io as ioClient } from "socket.io-client";
import { setupSocket } from "../src/socket/index.js";
import * as roomStore from "../src/rooms/roomStore.js";
import { isRateLimited, clearRateLimits } from "../src/socket/rateLimiter.js";

let httpServer;
let io;
let port;
const clients = [];

function connectClient() {
  const socket = ioClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  return socket;
}

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeEach(async () => {
  httpServer = createServer();
  io = setupSocket(httpServer, "*");
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterEach(async () => {
  for (const c of roomStore.allCodes()) roomStore.remove(c);
  clients.forEach((c) => c.disconnect());
  clients.length = 0;
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

describe("isRateLimited (unidad)", () => {
  it("permite hasta max hits dentro de la ventana y rechaza el siguiente", () => {
    const socketId = "socket-a";
    const opts = { max: 3, windowMs: 1000 };
    expect(isRateLimited(socketId, "test:action", opts)).toBe(false);
    expect(isRateLimited(socketId, "test:action", opts)).toBe(false);
    expect(isRateLimited(socketId, "test:action", opts)).toBe(false);
    expect(isRateLimited(socketId, "test:action", opts)).toBe(true);
  });

  it("no mezcla el conteo entre sockets ni entre acciones distintas", () => {
    const opts = { max: 1, windowMs: 1000 };
    expect(isRateLimited("socket-a", "action-x", opts)).toBe(false);
    expect(isRateLimited("socket-b", "action-x", opts)).toBe(false);
    expect(isRateLimited("socket-a", "action-y", opts)).toBe(false);
  });

  it("clearRateLimits libera el contador de un socket", () => {
    const opts = { max: 1, windowMs: 1000 };
    expect(isRateLimited("socket-c", "action-z", opts)).toBe(false);
    expect(isRateLimited("socket-c", "action-z", opts)).toBe(true);
    clearRateLimits("socket-c");
    expect(isRateLimited("socket-c", "action-z", opts)).toBe(false);
  });
});

describe("rate limiting de eventos de escritura vía socket real", () => {
  it("card:add responde error:rate_limited al superar el tope, sin crear la tarjeta extra", async () => {
    const host = connectClient();
    host.emit("room:create", { hostName: "Cisco" });
    const { code } = await waitFor(host, "room:created");

    host.emit("phase:start_session");
    await waitFor(host, "room:state");
    for (let i = 0; i < 2; i++) {
      host.emit("phase:advance");
      await waitFor(host, "room:state");
    }

    let lastState;
    for (let i = 0; i < 20; i++) {
      lastState = await new Promise((resolve) => {
        host.once("room:state", resolve);
        host.emit("card:add", { column: "keep", text: `card ${i}` });
      });
    }
    expect(lastState.room.cards).toHaveLength(20);

    const rateLimitedPromise = waitFor(host, "error:rate_limited");
    host.emit("card:add", { column: "keep", text: "una de más" });
    const error = await rateLimitedPromise;
    expect(error.action).toBe("card:add");
    expect(roomStore.get(code).cards).toHaveLength(20);
  });

  it("room:join responde error:rate_limited al superar el tope de intentos", async () => {
    const client = connectClient();

    for (let i = 0; i < 20; i++) {
      const notFoundPromise = waitFor(client, "room:not_found");
      client.emit("room:join", { code: "RETRO-ZZZZ", name: "Nadie" });
      await notFoundPromise;
    }

    const rateLimitedPromise = waitFor(client, "error:rate_limited");
    client.emit("room:join", { code: "RETRO-ZZZZ", name: "Nadie" });
    const error = await rateLimitedPromise;
    expect(error.action).toBe("room:join");
  });
});
