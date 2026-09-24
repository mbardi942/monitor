import { ValueObject } from "@monitor/shared-kernel";

export type ProbeHealthStatus = "HEALTHY" | "UNHEALTHY" | "TIMEOUT" | "ERROR";
export type DataAlertLevel = "NORMAL" | "WARNING" | "CRITICAL";

export interface ProbeOutcomeProps {
  probeHealth: ProbeHealthStatus;
  dataAlertLevel?: DataAlertLevel;
}

export class ProbeOutcome extends ValueObject<ProbeOutcomeProps> {
  public get probeHealth(): ProbeHealthStatus {
    return this.props.probeHealth;
  }

  public get dataAlertLevel(): DataAlertLevel | undefined {
    return this.props.dataAlertLevel;
  }

  public get isHealthy(): boolean {
    return this.props.probeHealth === "HEALTHY";
  }

  public get hasDataAlert(): boolean {
    return this.props.dataAlertLevel !== undefined && this.props.dataAlertLevel !== "NORMAL";
  }

  public static create(props: ProbeOutcomeProps): ProbeOutcome {
    if (!props.probeHealth) {
      throw new Error("Probe health status is required.");
    }

    return new ProbeOutcome({
      probeHealth: props.probeHealth,
      dataAlertLevel: props.dataAlertLevel ?? "NORMAL",
    });
  }
}
