import { ProbeExecutor } from "../../domain/ports/probe-executor.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";

export class HttpProbeExecutor implements ProbeExecutor {
  public async execute(config: ProbeConfiguration): Promise<CheckResult> {
    const httpConfig = config.http;
    if (!httpConfig) {
      return CheckResult.createFailure(0, "Invalid configuration for HTTP probe.");
    }

    const { url, method, headers, body, timeoutMs } = httpConfig;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const start = performance.now();

    try {
      const response = await fetch(url, {
        method,
        headers: headers || {},
        body: method !== "GET" && method !== "HEAD" ? body : undefined,
        signal: controller.signal,
      });

      // Leggiamo il body come testo
      const responseBody = await response.text();
      const end = performance.now();
      const responseTimeMs = Math.round(end - start);

      // Convertiamo gli headers in un semplice Record
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
