import { DomainEvent } from "@monitor/shared-kernel";

export class DataAlertTriggered implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventType: string = "DataAlertTriggered";

  constructor(
    public readonly checkExecutionId: string,
    public readonly monitorId: string,
    public readonly monitorName: string,
    public readonly alertLevel: "NORMAL" | "WARNING" | "CRITICAL",
    public readonly failedMetrics: { rule: string; actual: string; expected: string }[],
    public readonly failedAssertions: { rule: string; actual: string; expected: string }[] = [],
    public readonly extractedData?: Record<string, any>
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
