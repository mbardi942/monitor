import { DomainEvent } from "@monitor/shared-kernel";

export class ReportConfirmed implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType = "ReportConfirmed";

  constructor(
    public readonly reportId: string,
    public readonly dashboardId: string,
    public readonly reportContent: Record<string, any>,
    public readonly customText: string | null,
    public readonly periodFrom: Date,
    public readonly periodTo: Date
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
