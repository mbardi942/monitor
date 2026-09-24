import { DomainEvent } from "./domain-event.js";

export interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: any) => Promise<void> | void): void;
}
