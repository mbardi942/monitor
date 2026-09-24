import { ValueObject } from "@monitor/shared-kernel";

export class MonitorType extends ValueObject<{ value: "HTTP" | "PING" | "HOST" | "HEARTBEAT" }> {
  public static readonly HTTP = new MonitorType({ value: "HTTP" });
  public static readonly PING = new MonitorType({ value: "PING" });
  public static readonly HOST = new MonitorType({ value: "HOST" });
  public static readonly HEARTBEAT = new MonitorType({ value: "HEARTBEAT" });

  public get value(): "HTTP" | "PING" | "HOST" | "HEARTBEAT" {
    return this.props.value;
  }

  public static create(value: string): MonitorType {
    if (value === "HTTP") return MonitorType.HTTP;
    if (value === "PING") return MonitorType.PING;
    if (value === "HOST") return MonitorType.HOST;
    if (value === "HEARTBEAT") return MonitorType.HEARTBEAT;
    throw new Error(`Invalid monitor type: ${value}`);
  }
}

