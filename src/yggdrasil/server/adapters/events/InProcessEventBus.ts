import { EventEmitter } from "events";
import type { DomainEvent } from "../../core/events/DomainEvent";
import type { IEventBus } from "../../core/ports/IEventBus";
import { createLogger } from "../../infra/logger";

const ALL_EVENTS = "*";
const log = createLogger({ component: "InProcessEventBus" });

export class InProcessEventBus implements IEventBus {
  private readonly emitter = new EventEmitter();

  publish(event: DomainEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit(ALL_EVENTS, event);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => void): () => void {
    const wrapped = this.wrapHandler(eventType, handler);
    this.emitter.on(eventType, wrapped);
    return () => this.emitter.off(eventType, wrapped);
  }

  subscribeAll(handler: (event: DomainEvent) => void): () => void {
    const wrapped = this.wrapHandler(ALL_EVENTS, handler);
    this.emitter.on(ALL_EVENTS, wrapped);
    return () => this.emitter.off(ALL_EVENTS, wrapped);
  }

  private wrapHandler(eventType: string, handler: (event: DomainEvent) => void) {
    return (event: DomainEvent) => {
      try {
        const result = handler(event) as unknown;
        if (result && typeof (result as PromiseLike<unknown>).then === "function") {
          void (result as PromiseLike<unknown>).then(undefined, (err) => {
            log.error({ err, eventType, publishedType: event.type }, "Async event handler failed");
          });
        }
      } catch (err) {
        log.error({ err, eventType, publishedType: event.type }, "Event handler failed");
      }
    };
  }
}
