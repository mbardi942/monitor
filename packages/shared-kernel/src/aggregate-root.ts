import { Entity } from "./entity.js";
import { Identifier } from "./identifier.js";
import { DomainEvent } from "./domain-event.js";

export abstract class AggregateRoot<IdType extends Identifier<any>> extends Entity<IdType> {
  private _domainEvents: DomainEvent[] = [];

  public get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this.clearDomainEvents();
    return events;
  }
}
