import { ValueObject } from "@monitor/shared-kernel";

export type DataHealthStatusValue = "OK" | "WARNING" | "CRITICAL" | "NONE";

export class DataHealthStatus extends ValueObject<{ value: DataHealthStatusValue }> {
  public static readonly OK = new DataHealthStatus({ value: "OK" });
  public static readonly WARNING = new DataHealthStatus({ value: "WARNING" });
  public static readonly CRITICAL = new DataHealthStatus({ value: "CRITICAL" });
  public static readonly NONE = new DataHealthStatus({ value: "NONE" });

  public get value(): DataHealthStatusValue {
    return this.props.value;
  }

  public static create(value: string): DataHealthStatus {
    const uppercaseValue = value.toUpperCase() as DataHealthStatusValue;
    switch (uppercaseValue) {
      case "OK":
        return DataHealthStatus.OK;
      case "WARNING":
        return DataHealthStatus.WARNING;
      case "CRITICAL":
        return DataHealthStatus.CRITICAL;
      case "NONE":
        return DataHealthStatus.NONE;
      default:
        throw new Error(`Invalid data health status: ${value}`);
    }
  }
}
