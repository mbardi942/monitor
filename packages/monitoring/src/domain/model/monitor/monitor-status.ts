import { ValueObject } from "@monitor/shared-kernel";

export type MonitorStatusValue = "UP" | "DOWN" | "DEGRADED" | "PAUSED";

export class MonitorStatus extends ValueObject<{ value: MonitorStatusValue }> {
  public static readonly UP = new MonitorStatus({ value: "UP" });
  public static readonly DOWN = new MonitorStatus({ value: "DOWN" });
  public static readonly DEGRADED = new MonitorStatus({ value: "DEGRADED" });
  public static readonly PAUSED = new MonitorStatus({ value: "PAUSED" });

  public get value(): MonitorStatusValue {
    return this.props.value;
  }

  public static create(value: string): MonitorStatus {
    const uppercaseValue = value.toUpperCase() as MonitorStatusValue;
    switch (uppercaseValue) {
      case "UP":
        return MonitorStatus.UP;
      case "DOWN":
        return MonitorStatus.DOWN;
      case "DEGRADED":
        return MonitorStatus.DEGRADED;
      case "PAUSED":
        return MonitorStatus.PAUSED;
      default:
        throw new Error(`Invalid monitor status: ${value}`);
    }
  }

  public canTransitionTo(nextStatus: MonitorStatus): boolean {
    const current = this.value;
    const next = nextStatus.value;

    if (current === next) return true;

    // Se è PAUSED, può passare solo a UP (riattivazione)
    if (current === "PAUSED") {
      return next === "UP";
    }

    // Altrimenti (UP, DOWN, DEGRADED) può passare a qualsiasi altro stato
    return true;
  }
}
