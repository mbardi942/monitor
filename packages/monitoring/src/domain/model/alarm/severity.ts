import { ValueObject } from "@monitor/shared-kernel";

export type SeverityValue = "INFO" | "WARNING" | "CRITICAL";

export class Severity extends ValueObject<{ value: SeverityValue }> {
  public static readonly INFO = new Severity({ value: "INFO" });
  public static readonly WARNING = new Severity({ value: "WARNING" });
  public static readonly CRITICAL = new Severity({ value: "CRITICAL" });

  public get value(): SeverityValue {
    return this.props.value;
  }

  public static create(value: string): Severity {
    const uppercaseValue = value.toUpperCase() as SeverityValue;
    switch (uppercaseValue) {
      case "INFO":
        return Severity.INFO;
      case "WARNING":
        return Severity.WARNING;
      case "CRITICAL":
        return Severity.CRITICAL;
      default:
        throw new Error(`Invalid severity: ${value}`);
    }
  }
}
