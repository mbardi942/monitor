import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorAddedToDashboard implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorAddedToDashboard";

  constructor(
    public readonly dashboardId: string,
    public readonly monitorId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
