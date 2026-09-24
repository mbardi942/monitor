import { DomainEvent } from "@monitor/shared-kernel";

export class AlarmRaised implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "AlarmRaised";

  constructor(
    public readonly alarmId: string,
    public readonly monitorId: string,
    public readonly severity: string,
    public readonly triggerCheckExecutionId: string,
    public readonly alarmType: string = "AVAILABILITY"
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

