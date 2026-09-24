import { ValueObject } from "@monitor/shared-kernel";

export type AlarmConfirmationStatusValue = "OPEN" | "CONFIRMED" | "NOTIFIED" | "RESOLVED";

export class AlarmConfirmationStatus extends ValueObject<{ value: AlarmConfirmationStatusValue }> {
  public static readonly OPEN = new AlarmConfirmationStatus({ value: "OPEN" });
  public static readonly CONFIRMED = new AlarmConfirmationStatus({ value: "CONFIRMED" });
  public static readonly NOTIFIED = new AlarmConfirmationStatus({ value: "NOTIFIED" });
  public static readonly RESOLVED = new AlarmConfirmationStatus({ value: "RESOLVED" });

  public get value(): AlarmConfirmationStatusValue {
    return this.props.value;
  }

  public static create(value: string): AlarmConfirmationStatus {
    const uppercaseValue = value.toUpperCase() as AlarmConfirmationStatusValue;
    switch (uppercaseValue) {
      case "OPEN":
        return AlarmConfirmationStatus.OPEN;
      case "CONFIRMED":
        return AlarmConfirmationStatus.CONFIRMED;
      case "NOTIFIED":
        return AlarmConfirmationStatus.NOTIFIED;
      case "RESOLVED":
        return AlarmConfirmationStatus.RESOLVED;
      default:
        throw new Error(`Invalid alarm confirmation status: ${value}`);
    }
  }
}
