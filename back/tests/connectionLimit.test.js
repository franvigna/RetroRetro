import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "node:http";
import { io as ioClient } from "socket.io-client";
import { setupSocket } from "../src/socket/index.js";
import * as roomStore from "../src/rooms/roomStore.js";

let httpServer;
let io;
let port;
const clients = [];

function connectClient() {
  const socket = ioClient(`http://localhost:${port}`, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  return socket;
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function waitForConnectError(socket) {
  return new Promise((resolve) => socket.once("connect_error", resolve));
}

beforeEach(async () => {
  httpServer = createServer();
  // Tope bajo (2) para poder probar el límite sin abrir decenas de sockets reales.
  io = setupSocket(httpServer, "*", { maxConnections: 2 });
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

describe("HU-B11: tope global de conexiones simultáneas", () => {
  it("acepta conexiones hasta el límite configurado", async () => {
    const a = connectClient();
    const b = connectClient();
    await Promise.all([waitForConnect(a), waitForConnect(b)]);
    expect(a.connected).toBe(true);
    expect(b.connected).toBe(true);
  });

  it("rechaza una conexión por encima del límite con connect_error 'server_full'", async () => {
    const a = connectClient();
    const b = connectClient();
    await Promise.all([waitForConnect(a), waitForConnect(b)]);

    const c = connectClient();
    const err = await waitForConnectError(c);
    expect(err.message).toBe("server_full");
    expect(c.connected).toBe(false);
  });

  it("acepta una conexión nueva una vez que se libera lugar", async () => {
    const a = connectClient();
    const b = connectClient();
    await Promise.all([waitForConnect(a), waitForConnect(b)]);

    a.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const c = connectClient();
    await waitForConnect(c);
    expect(c.connected).toBe(true);
  });
});
