import { DomainEvent } from "@monitor/shared-kernel";

export class CheckExecuted implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "CheckExecuted";

  constructor(
    public readonly checkExecutionId: string,
    public readonly monitorId: string,
    public readonly timestamp: Date,
    public readonly status: "UP" | "DOWN",
    public readonly responseTimeMs: number,
    public readonly extractedData: Record<string, any> | undefined,
    public readonly assertionResults: any[],
    public readonly metricResults: any[] = [],
    public readonly probeHealth?: string,
    public readonly dataAlertLevel?: string,
    public readonly dataStatus?: string
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
