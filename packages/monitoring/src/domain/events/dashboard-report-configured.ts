import { DomainEvent } from "@monitor/shared-kernel";

export class DashboardReportConfigured implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType = "DashboardReportConfigured";

  constructor(
    public readonly dashboardId: string,
    public readonly isEnabled: boolean,
    public readonly cron: string | null
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
