import { ValueObject } from "@monitor/shared-kernel";

export interface AlarmPeriodProps {
  openedAt: Date;
  confirmedAt?: Date;
  notifiedAt?: Date;
  resolvedAt?: Date;
}

export class AlarmPeriod extends ValueObject<AlarmPeriodProps> {
  public get openedAt(): Date {
    return this.props.openedAt;
  }

  public get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  public get notifiedAt(): Date | undefined {
    return this.props.notifiedAt;
  }

  public get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }

  public static create(props: AlarmPeriodProps): AlarmPeriod {
    return new AlarmPeriod(props);
  }

  public confirm(confirmedAt: Date = new Date()): AlarmPeriod {
    return new AlarmPeriod({
      ...this.props,
      confirmedAt,
    });
  }

  public markNotified(notifiedAt: Date = new Date()): AlarmPeriod {
    return new AlarmPeriod({
      ...this.props,
      notifiedAt,
    });
  }

  public resolve(resolvedAt: Date = new Date()): AlarmPeriod {
    return new AlarmPeriod({
      ...this.props,
      resolvedAt,
    });
  }
}
