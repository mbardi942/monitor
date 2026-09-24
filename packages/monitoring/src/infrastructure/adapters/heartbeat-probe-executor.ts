import { ProbeExecutor } from "../../domain/ports/probe-executor.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";

export class HeartbeatProbeExecutor implements ProbeExecutor {
  public async execute(config: ProbeConfiguration): Promise<CheckResult> {
    const hbConfig = config.heartbeat;
    if (!hbConfig) {
      return CheckResult.createFailure(0, "Invalid configuration for HEARTBEAT probe.");
    }

    const { lastPingAt, expectedIntervalSeconds, gracePeriodSeconds } = hbConfig;
    const maxAllowedSeconds = expectedIntervalSeconds + gracePeriodSeconds;

    if (!lastPingAt) {
      return CheckResult.createFailure(
        0,
        "In attesa del primo heartbeat. Nessun ping ancora ricevuto."
      );
    }

    const elapsedMs = Date.now() - Date.parse(lastPingAt);
    const elapsedSeconds = Math.round(elapsedMs / 1000);

    if (elapsedSeconds > maxAllowedSeconds) {
      const elapsedMinutes = Math.round(elapsedSeconds / 60);
      const maxAllowedMinutes = Math.round(maxAllowedSeconds / 60);
      return CheckResult.createFailure(
        0,
        `Heartbeat scaduto: ultimo ping ricevuto ${elapsedMinutes} minuti fa (limite consentito: ${maxAllowedMinutes} min).`
      );
    }

    return CheckResult.createSuccess(
      0,
      200,
      {},
      JSON.stringify({
        status: "OK",
        lastPingAt,
        elapsedSeconds,
        maxAllowedSeconds,
      })
    );
  }
}
