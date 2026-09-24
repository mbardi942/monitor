import { Identifier } from "@monitor/shared-kernel";

export class MonitorId extends Identifier<string> {
  public static create(value: string): MonitorId {
    return new MonitorId(value);
  }

  public static generate(): MonitorId {
    return new MonitorId(crypto.randomUUID());
  }
}
