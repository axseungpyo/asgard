import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { validateToken } from "../infra/auth";
import { createLogger } from "../infra/logger";

const PORT = parseInt(process.env.PORT || "7777", 10);
const WS_HEARTBEAT_INTERVAL = 30_000;
const log = createLogger({ component: "YggdrasilServer" });

export interface WebSocketManagers {
  wssLogs: WebSocketServer;
  wssStatus: WebSocketServer;
  wssOdin: WebSocketServer;
}

export type AuthorizeWebSocket = (
  ws: WebSocket,
  request: http.IncomingMessage,
  channel: string
) => boolean;

export type Broadcast = (wss: WebSocketServer, data: unknown) => void;

export function createWebSocketServers(server: http.Server): WebSocketManagers {
  const wssLogs = new WebSocketServer({ noServer: true });
  const wssStatus = new WebSocketServer({ noServer: true });
  const wssOdin = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "/", `http://localhost:${PORT}`);

    if (pathname === "/ws/logs") {
      wssLogs.handleUpgrade(request, socket, head, (ws) => {
        wssLogs.emit("connection", ws, request);
      });
    } else if (pathname === "/ws/status") {
      wssStatus.handleUpgrade(request, socket, head, (ws) => {
        wssStatus.emit("connection", ws, request);
      });
    } else if (pathname === "/ws/odin") {
      wssOdin.handleUpgrade(request, socket, head, (ws) => {
        wssOdin.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.on("close", () => {
    wssLogs.close();
    wssStatus.close();
    wssOdin.close();
  });

  return { wssLogs, wssStatus, wssOdin };
}

export function setupHeartbeat(wss: WebSocketServer) {
  const aliveMap = new WeakMap<WebSocket, boolean>();

  wss.on("connection", (ws) => {
    aliveMap.set(ws, true);
    ws.on("pong", () => aliveMap.set(ws, true));
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (aliveMap.get(ws) === false) {
        ws.terminate();
        return;
      }
      aliveMap.set(ws, false);
      ws.ping();
    });
  }, WS_HEARTBEAT_INTERVAL);

  wss.on("close", () => clearInterval(interval));
}

export const authorizeWebSocket: AuthorizeWebSocket = (ws, request, channel) => {
  const url = new URL(request.url || "/", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token") ?? "";

  if (!validateToken(token)) {
    log.warn({ channel, pathname: url.pathname }, "Rejected unauthorized WebSocket connection");
    ws.close(4001, "Unauthorized");
    return false;
  }

  return true;
};

export const broadcast: Broadcast = (wss, data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
