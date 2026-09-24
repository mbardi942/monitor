import { Identifier } from "@monitor/shared-kernel";

export class ReportId extends Identifier<string> {
  public static create(value: string): ReportId {
    return new ReportId(value);
  }

  public static generate(): ReportId {
    return new ReportId(crypto.randomUUID());
  }
}
