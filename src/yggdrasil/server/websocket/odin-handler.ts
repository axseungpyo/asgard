import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import {
  getMessages,
  processApproval,
  processCommand,
  saveHistory,
} from "../domain/odin/odin-channel";
import { createLogger } from "../infra/logger";
import type { AsgardWatcher } from "../infra/watcher";
import type { AuthorizeWebSocket, Broadcast } from "./ws-manager";

const log = createLogger({ component: "YggdrasilServer" });

export async function handleOdinConnection(
  ws: WebSocket,
  request: http.IncomingMessage,
  _watcher: AsgardWatcher,
  asgardRoot: string,
  authorizeWs: AuthorizeWebSocket,
  broadcast: Broadcast,
  wssOdin: WebSocketServer
) {
  if (!authorizeWs(ws, request, "odin")) {
    return;
  }

  ws.send(JSON.stringify({ type: "connected", data: { message: "Odin channel connected" } }));

  const history = getMessages(50);
  for (const msg of history) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", data: msg }));
    }
  }

  ws.on("message", async (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());

      if (parsed.type === "command" && typeof parsed.content === "string") {
        const result = await processCommand(parsed.content, asgardRoot);
        await saveHistory(asgardRoot);
        for (const msg of result.messages) {
          broadcast(wssOdin, { type: "message", data: msg });
        }
      } else if (parsed.type === "approve" && typeof parsed.approvalId === "string") {
        const result = await processApproval(parsed.approvalId, parsed.approved !== false, asgardRoot);
        await saveHistory(asgardRoot);
        for (const msg of result.messages) {
          broadcast(wssOdin, { type: "message", data: msg });
        }
      }
    } catch (err) {
      log.error({ err }, "Failed to process Odin WS message");
    }
  });
}
