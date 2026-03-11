import type { DomainEvent } from "../events/DomainEvent";

export interface IEventBus {
  publish(event: DomainEvent): void;
  subscribe(eventType: string, handler: (event: DomainEvent) => void): () => void;
  subscribeAll(handler: (event: DomainEvent) => void): () => void;
}
