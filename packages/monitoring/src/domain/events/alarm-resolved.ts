import { DomainEvent } from "@monitor/shared-kernel";

export class AlarmResolved implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "AlarmResolved";

  constructor(
    public readonly alarmId: string,
    public readonly monitorId: string,
    public readonly monitorName: string,
    public readonly durationMs: number,
    public readonly wasNotified: boolean,
    public readonly recoveryEnabled: boolean
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
