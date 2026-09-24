import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorStatusChanged implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorStatusChanged";

  constructor(
    public readonly monitorId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
