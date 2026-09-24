import { DomainEvent } from "@monitor/shared-kernel";

export class AlarmNotified implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "AlarmNotified";

  constructor(
    public readonly alarmId: string,
    public readonly monitorId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
