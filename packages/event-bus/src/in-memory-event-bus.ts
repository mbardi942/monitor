import { EventEmitter } from "events";
import { DomainEvent, DomainEventBus } from "@monitor/shared-kernel";

export class InMemoryEventBus implements DomainEventBus {
  private readonly emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Aumentiamo il limite di listener per evitare avvertimenti in console
    this.emitter.setMaxListeners(100);
  }

  public async publish(event: DomainEvent): Promise<void> {
    const eventType = event.eventType;
    const listeners = this.emitter.listeners(eventType);

    if (listeners.length === 0) {
      return;
    }

    // Eseguiamo tutti gli handler registrati per questo evento in parallelo
    const promises = listeners.map(async (listener) => {
      try {
        await (listener as (event: DomainEvent) => Promise<void> | void)(event);
      } catch (error) {
        console.error(
          `[InMemoryEventBus] Error handling event ${eventType} (ID: ${event.eventId}):`,
          error
        );
      }
    });

    await Promise.all(promises);
  }

  public subscribe(
    eventType: string,
    handler: (event: any) => Promise<void> | void
  ): void {
    this.emitter.on(eventType, handler);
  }
}
