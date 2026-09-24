import { ValueObject } from "@monitor/shared-kernel";

export interface FailureAccumulatorProps {
  consecutiveFailureCount: number;
  firstFailureAt: Date;
}

export class FailureAccumulator extends ValueObject<FailureAccumulatorProps> {
  public get consecutiveFailureCount(): number {
    return this.props.consecutiveFailureCount;
  }

  public get firstFailureAt(): Date {
    return this.props.firstFailureAt;
  }

  public static create(props: FailureAccumulatorProps): FailureAccumulator {
    if (props.consecutiveFailureCount < 0) {
      throw new Error("Consecutive failure count cannot be negative");
    }
    return new FailureAccumulator(props);
  }

  public static createEmpty(firstFailureAt: Date = new Date()): FailureAccumulator {
    return new FailureAccumulator({
      consecutiveFailureCount: 0,
      firstFailureAt,
    });
  }

  public increment(): FailureAccumulator {
    return new FailureAccumulator({
      consecutiveFailureCount: this.props.consecutiveFailureCount + 1,
      firstFailureAt: this.props.firstFailureAt,
    });
  }

  public reset(firstFailureAt: Date = new Date()): FailureAccumulator {
    return new FailureAccumulator({
      consecutiveFailureCount: 0,
      firstFailureAt,
    });
  }
}
