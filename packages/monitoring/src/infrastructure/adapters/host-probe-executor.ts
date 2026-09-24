import { ProbeExecutor } from "../../domain/ports/probe-executor.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";

export class HostProbeExecutor implements ProbeExecutor {
  public async execute(config: ProbeConfiguration): Promise<CheckResult> {
    const hostConfig = config.host;
    if (!hostConfig) {
      return CheckResult.createFailure(0, "Invalid configuration for HOST probe.");
    }

    const { url, token, timeoutMs } = hostConfig;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const start = performance.now();

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      const responseBody = await response.text();
      const end = performance.now();
      const responseTimeMs = Math.round(end - start);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return CheckResult.createSuccess(
        responseTimeMs,
        response.status,
        responseHeaders,
        responseBody
      );
    } catch (error: any) {
      const end = performance.now();
      const responseTimeMs = Math.round(end - start);

      if (error.name === "AbortError") {
        return CheckResult.createFailure(
          responseTimeMs,
          `Request timed out after ${timeoutMs}ms`
        );
      }

      return CheckResult.createFailure(
        responseTimeMs,
        error.message || "Unknown network error"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
