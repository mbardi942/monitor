import net from "net";
import { ProbeExecutor } from "../../domain/ports/probe-executor.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";

export class PingProbeExecutor implements ProbeExecutor {
  public async execute(config: ProbeConfiguration): Promise<CheckResult> {
    const pingConfig = config.ping;
    if (!pingConfig) {
      return CheckResult.createFailure(0, "Invalid configuration for PING probe.");
    }

    const { host, timeoutMs } = pingConfig;
    const port = pingConfig.port || 80;

    const start = performance.now();

    return new Promise<CheckResult>((resolve) => {
      let resolved = false;
      const socket = new net.Socket();

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          const end = performance.now();
          const responseTimeMs = Math.round(end - start);
          resolve(
            CheckResult.createFailure(
              responseTimeMs,
              `Connection timed out after ${timeoutMs}ms`
            )
          );
        }
      }, timeoutMs);

      socket.connect(port, host, () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          socket.end();
          const end = performance.now();
          const responseTimeMs = Math.round(end - start);
          resolve(
            CheckResult.createSuccess(
              responseTimeMs,
              200,
              {},
              `Successfully connected to ${host}:${port}`
            )
          );
        }
      });

      socket.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          socket.destroy();
          const end = performance.now();
          const responseTimeMs = Math.round(end - start);
          resolve(
            CheckResult.createFailure(
              responseTimeMs,
              `Connection failed: ${err.message}`
            )
          );
        }
      });
    });
  }
}
