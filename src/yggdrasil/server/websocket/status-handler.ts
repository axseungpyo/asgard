import fs from "fs/promises";
import http from "http";
import path from "path";
import { WebSocket } from "ws";
import type { FileChangedPayload } from "../core/events/FileChanged";
import { AGENT_STARTED_EVENT } from "../core/events/AgentStarted";
import { AGENT_STOPPED_EVENT } from "../core/events/AgentStopped";
import { FILE_CHANGED_EVENT } from "../core/events/FileChanged";
import { TASK_CREATED_EVENT } from "../core/events/TaskCreated";
import { TASK_STATUS_CHANGED_EVENT } from "../core/events/TaskStatusChanged";
import type { IEventBus } from "../core/ports/IEventBus";
import { getAgentStates } from "../domain/agents/agent-state";
import { parseIndex } from "../domain/tasks/task-parser";
import type { Container } from "../di/container";
import { createLogger } from "../infra/logger";
import type { AsgardWatcher } from "../infra/watcher";
import type { AuthorizeWebSocket, Broadcast } from "./ws-manager";

const log = createLogger({ component: "YggdrasilServer" });

export async function handleStatusConnection(
  ws: WebSocket,
  request: http.IncomingMessage,
  watcher: AsgardWatcher,
  container: Container,
  eventBus: IEventBus,
  authorizeWs: AuthorizeWebSocket,
  _broadcast: Broadcast
) {
  if (!authorizeWs(ws, request, "status")) {
    return;
  }

  ws.send(JSON.stringify({ type: "connected", data: { message: "Status stream connected" } }));
  try {
    const indexPath = path.join(container.asgardRoot, "artifacts", "INDEX.md");
    let content = "";
    try {
      content = await fs.readFile(indexPath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        log.error({ err }, "Failed to read INDEX.md");
      }
    }
    const tasks = parseIndex(content);
    const agents = await getAgentStates(container.agentRepository, tasks);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "status", data: agents }));
      ws.send(JSON.stringify({ type: "chronicle", data: tasks }));
    }
  } catch (err) {
    log.error({ err }, "Failed to send initial status");
  }

  let refreshTimer: NodeJS.Timeout | null = null;

  const sendCurrentState = async () => {
    try {
      const indexPath = path.join(container.asgardRoot, "artifacts", "INDEX.md");
      let content = "";
      try {
        content = await fs.readFile(indexPath, "utf-8");
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          log.error({ err }, "Failed to read INDEX.md");
        }
      }
      const tasks = parseIndex(content);
      const agents = await getAgentStates(container.agentRepository, tasks);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "status", data: agents }));
        ws.send(JSON.stringify({ type: "chronicle", data: tasks }));
      }
    } catch (err) {
      log.error({ err }, "Failed to refresh status stream");
    }
  };

  const queueRefresh = () => {
    if (refreshTimer) {
      return;
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void sendCurrentState();
    }, 25);
  };

  const unsubscribers = [
    eventBus.subscribe(TASK_CREATED_EVENT, () => {
      queueRefresh();
    }),
    eventBus.subscribe(TASK_STATUS_CHANGED_EVENT, () => {
      queueRefresh();
    }),
    eventBus.subscribe(AGENT_STARTED_EVENT, () => {
      queueRefresh();
    }),
    eventBus.subscribe(AGENT_STOPPED_EVENT, () => {
      queueRefresh();
    }),
    eventBus.subscribe(FILE_CHANGED_EVENT, (event) => {
      const payload = event.payload as unknown as FileChangedPayload;
      if (payload.type === "index" || payload.type === "handoff") {
        queueRefresh();
      }
    }),
  ];

  ws.on("close", () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  });
}
