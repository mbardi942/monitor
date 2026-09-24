import { ValueObject } from "@monitor/shared-kernel";

export type ReportStatusType = "DRAFT" | "CONFIRMED" | "SENT";

export class ReportStatus extends ValueObject<{ value: ReportStatusType }> {
  public get value(): ReportStatusType {
    return this.props.value;
  }

  public static create(value: ReportStatusType): ReportStatus {
    return new ReportStatus({ value });
  }

  public static draft(): ReportStatus {
    return new ReportStatus({ value: "DRAFT" });
  }

  public static confirmed(): ReportStatus {
    return new ReportStatus({ value: "CONFIRMED" });
  }

  public static sent(): ReportStatus {
    return new ReportStatus({ value: "SENT" });
  }

  public isDraft(): boolean {
    return this.props.value === "DRAFT";
  }

  public isConfirmed(): boolean {
    return this.props.value === "CONFIRMED";
  }

  public isSent(): boolean {
    return this.props.value === "SENT";
  }
}
