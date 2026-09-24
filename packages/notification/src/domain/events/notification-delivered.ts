import { DomainEvent } from "@monitor/shared-kernel";

export class NotificationDelivered implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType = "NotificationDelivered";

  constructor(
    public readonly notificationId: string,
    public readonly type: string,
    public readonly sourceId: string,
    public readonly dashboardIds: string[],
    public readonly deliveredChannels: string[]
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
