import http from "http";
import { WebSocket } from "ws";
import type { LogEntryPayload } from "../core/events/LogEntry";
import { LOG_ENTRY_EVENT } from "../core/events/LogEntry";
import type { IEventBus } from "../core/ports/IEventBus";
import { createLogger } from "../infra/logger";
import type { AsgardWatcher } from "../infra/watcher";
import type { AuthorizeWebSocket, Broadcast } from "./ws-manager";

const log = createLogger({ component: "YggdrasilServer" });

export async function handleLogsConnection(
  ws: WebSocket,
  request: http.IncomingMessage,
  watcher: AsgardWatcher,
  eventBus: IEventBus,
  authorizeWs: AuthorizeWebSocket,
  _broadcast: Broadcast
) {
  if (!authorizeWs(ws, request, "logs")) {
    return;
  }

  ws.send(JSON.stringify({ type: "connected", data: { message: "Logs stream connected" } }));
  try {
    const recentLogs = await watcher.getRecentLogs(100);
    for (const entry of recentLogs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "log", data: entry }));
      }
    }
  } catch (err) {
    log.error({ err }, "Failed to send initial logs");
  }

  const unsubscribe = eventBus.subscribe(LOG_ENTRY_EVENT, (event) => {
    const payload = event.payload as unknown as LogEntryPayload;
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify({
      type: "log",
      data: {
        timestamp: event.timestamp,
        agent: payload.agent,
        message: payload.message,
        level: payload.level,
      },
    }));
  });

  ws.on("close", unsubscribe);
}
