import { DomainEvent } from "@monitor/shared-kernel";

export class DashboardCreated implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "DashboardCreated";

  constructor(
    public readonly dashboardId: string,
    public readonly name: string,
    public readonly tenantId: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
