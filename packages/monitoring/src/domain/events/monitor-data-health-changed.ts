import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorDataHealthChanged implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorDataHealthChanged";

  constructor(
    public readonly monitorId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
