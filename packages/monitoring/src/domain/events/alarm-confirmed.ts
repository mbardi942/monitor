import { DomainEvent } from "@monitor/shared-kernel";

export class AlarmConfirmed implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "AlarmConfirmed";

  constructor(
    public readonly alarmId: string,
    public readonly monitorId: string,
    public readonly monitorName: string,
    public readonly severity: string,
    public readonly dashboardIds: string[],
    public readonly occurredAt: Date,
    public readonly extractedDataSummary?: any
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = occurredAt;
  }
}
