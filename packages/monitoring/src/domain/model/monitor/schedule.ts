import { ValueObject } from "@monitor/shared-kernel";

export interface ScheduleProps {
  intervalSeconds?: number;
  cron?: string;
}

export class Schedule extends ValueObject<ScheduleProps> {
  public get intervalSeconds(): number | undefined {
    return this.props.intervalSeconds;
  }

  public get cron(): string | undefined {
    return this.props.cron;
  }

  public static create(props: ScheduleProps): Schedule {
    if (!props.intervalSeconds && !props.cron) {
      throw new Error("Either intervalSeconds or cron must be provided.");
    }
    if (props.intervalSeconds !== undefined && props.intervalSeconds <= 0) {
      throw new Error("Interval seconds must be greater than zero.");
    }
    return new Schedule({
      intervalSeconds: props.intervalSeconds,
      cron: props.cron,
    });
  }
}
