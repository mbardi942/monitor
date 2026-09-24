import { DomainEvent } from "@monitor/shared-kernel";

export class AlarmEscalated implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "AlarmEscalated";

  constructor(
    public readonly alarmId: string,
    public readonly previousSeverity: string,
    public readonly newSeverity: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
