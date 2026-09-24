import { Identifier } from "@monitor/shared-kernel";

export class DashboardId extends Identifier<string> {
  public static create(value: string): DashboardId {
    return new DashboardId(value);
  }

  public static generate(): DashboardId {
    return new DashboardId(crypto.randomUUID());
  }
}
