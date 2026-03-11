import http from "http";
import type { AsgardWatcher } from "../infra/watcher";
import { handleLogsConnection } from "./logs-handler";
import { handleOdinConnection } from "./odin-handler";
import { handleStatusConnection } from "./status-handler";
import {
  authorizeWebSocket,
  broadcast,
  createWebSocketServers,
  setupHeartbeat,
} from "./ws-manager";

export function setupWebSockets(
  server: http.Server,
  watcher: AsgardWatcher,
  asgardRoot: string
): void {
  const { wssLogs, wssStatus, wssOdin } = createWebSocketServers(server);

  setupHeartbeat(wssLogs);
  setupHeartbeat(wssStatus);
  setupHeartbeat(wssOdin);

  watcher.on("log-change", ({ lines }) => {
    for (const entry of lines) {
      broadcast(wssLogs, { type: "log", data: entry });
    }
  });

  watcher.on("index-change", ({ tasks }) => {
    broadcast(wssStatus, { type: "chronicle", data: tasks });
  });

  watcher.on("agent-change", ({ agents }) => {
    broadcast(wssStatus, { type: "status", data: agents });
  });

  wssLogs.on("connection", (ws, request) => {
    void handleLogsConnection(ws, request, watcher, authorizeWebSocket, broadcast);
  });

  wssStatus.on("connection", (ws, request) => {
    void handleStatusConnection(ws, request, watcher, asgardRoot, authorizeWebSocket, broadcast);
  });

  wssOdin.on("connection", (ws, request) => {
    void handleOdinConnection(
      ws,
      request,
      watcher,
      asgardRoot,
      authorizeWebSocket,
      broadcast,
      wssOdin
    );
  });
}
