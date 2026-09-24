import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorScheduleTriggered implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorScheduleTriggered";

  constructor(
    public readonly monitorId: string,
    public readonly scheduledAt: Date
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class ReportScheduleTriggered implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "ReportScheduleTriggered";

  constructor(
    public readonly dashboardId: string,
    public readonly scheduledAt: Date
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
