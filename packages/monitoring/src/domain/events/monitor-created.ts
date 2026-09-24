import { DomainEvent } from "@monitor/shared-kernel";

export class MonitorCreated implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "MonitorCreated";

  constructor(
    public readonly monitorId: string,
    public readonly name: string,
    public readonly type: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
