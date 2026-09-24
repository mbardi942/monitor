import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorConfigured implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorConfigured";

  constructor(
    public readonly monitorId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly probeConfiguration: any,
    public readonly schedule: any,
    public readonly assertionRules: any[],
    public readonly alarmPolicy: any,
    public readonly dataExtractor?: any
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
