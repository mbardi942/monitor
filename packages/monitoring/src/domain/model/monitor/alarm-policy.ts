import { ValueObject } from "@monitor/shared-kernel";

export interface AlarmPolicyProps {
  consecutiveFailures: number; // Es. 3 check falliti consecutivi
  downtimeDurationMinutes?: number; // Es. downtime di 5 minuti
  recoveryNotificationEnabled?: boolean; // Invia notifica quando torna UP (default true)
}

export class AlarmPolicy extends ValueObject<AlarmPolicyProps> {
  public get consecutiveFailures(): number {
    return this.props.consecutiveFailures;
  }

  public get downtimeDurationMinutes(): number | undefined {
    return this.props.downtimeDurationMinutes;
  }

  public get recoveryNotificationEnabled(): boolean {
    return this.props.recoveryNotificationEnabled !== false;
  }

  public static create(props: AlarmPolicyProps): AlarmPolicy {
    if (props.consecutiveFailures === undefined || props.consecutiveFailures < 1) {
      throw new Error("Consecutive failures must be at least 1.");
    }
    if (props.downtimeDurationMinutes !== undefined && props.downtimeDurationMinutes < 1) {
      throw new Error("Downtime duration minutes must be at least 1.");
    }
    return new AlarmPolicy({
      consecutiveFailures: props.consecutiveFailures,
      downtimeDurationMinutes: props.downtimeDurationMinutes,
      recoveryNotificationEnabled: props.recoveryNotificationEnabled !== false,
    });
  }

  public static createDefault(): AlarmPolicy {
    return new AlarmPolicy({ consecutiveFailures: 3, recoveryNotificationEnabled: true });
  }
}
