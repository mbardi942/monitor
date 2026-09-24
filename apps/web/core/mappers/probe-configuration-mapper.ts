export function flattenProbeConfiguration(probe: any): any {
  if (!probe) return {};
  if (probe.type === "HTTP" && probe.http) {
    return {
      url: probe.http.url,
      method: probe.http.method,
      headers: probe.http.headers,
      body: probe.http.body,
      timeoutMs: probe.http.timeoutMs,
      authProfileId: probe.http.authProfileId,
    };
  }
  if (probe.type === "PING" && probe.ping) {
    return {
      host: probe.ping.host,
      timeoutMs: probe.ping.timeoutMs,
      port: probe.ping.port || 80,
    };
  }
  if (probe.type === "HOST" && probe.host) {
    return {
      url: probe.host.url,
      token: probe.host.token,
      timeoutMs: probe.host.timeoutMs,
    };
  }
  if (probe.type === "HEARTBEAT" && probe.heartbeat) {
    return {
      heartbeatToken: probe.heartbeat.token,
      expectedIntervalSeconds: probe.heartbeat.expectedIntervalSeconds,
      gracePeriodSeconds: probe.heartbeat.gracePeriodSeconds,
      lastPingAt: probe.heartbeat.lastPingAt,
    };
  }
  return probe;
}

export function nestProbeConfiguration(type: "HTTP" | "PING" | "HOST" | "HEARTBEAT", probe: any): any {
  if (!probe) return {};
  if (type === "HTTP") {
    return {
      type: "HTTP",
      http: {
        url: probe.url,
        method: probe.method || "GET",
        headers: probe.headers || {},
        body: probe.body,
        timeoutMs: probe.timeoutMs || 5000,
        authProfileId: probe.authProfileId,
      },
    };
  }
  if (type === "PING") {
    return {
      type: "PING",
      ping: {
        host: probe.host,
        timeoutMs: probe.timeoutMs || 5000,
        port: probe.port || 80,
      },
    };
  }
  if (type === "HOST") {
    return {
      type: "HOST",
      host: {
        url: probe.url,
        token: probe.token,
        timeoutMs: probe.timeoutMs || 5000,
      },
    };
  }
  if (type === "HEARTBEAT") {
    return {
      type: "HEARTBEAT",
      heartbeat: {
        token: probe.heartbeatToken || probe.token,
        expectedIntervalSeconds: Number(probe.expectedIntervalSeconds) || 3600,
        gracePeriodSeconds: Number(probe.gracePeriodSeconds) ?? 300,
        lastPingAt: probe.lastPingAt,
      },
    };
  }
  return probe;
}

