import { ValueObject } from "@monitor/shared-kernel";

export interface ReportPeriodProps {
  from: Date;
  to: Date;
}

export class ReportPeriod extends ValueObject<ReportPeriodProps> {
  public get from(): Date {
    return this.props.from;
  }

  public get to(): Date {
    return this.props.to;
  }

  public static create(from: Date, to: Date): ReportPeriod {
    if (from >= to) {
      throw new Error("Start date (from) must be earlier than end date (to).");
    }
    return new ReportPeriod({ from, to });
  }
}
