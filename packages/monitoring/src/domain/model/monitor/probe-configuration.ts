import { ValueObject } from "@monitor/shared-kernel";

export interface HttpProbeProps {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
  authProfileId?: string;
}

export interface PingProbeProps {
  host: string;
  timeoutMs: number;
  port?: number;
}

export interface HostProbeProps {
  url: string;
  token: string;
  timeoutMs: number;
}

export interface HeartbeatProbeProps {
  token: string;
  expectedIntervalSeconds: number;
  gracePeriodSeconds: number;
  lastPingAt?: string;
}

export type ProbeProps =
  | { type: "HTTP"; http: HttpProbeProps }
  | { type: "PING"; ping: PingProbeProps }
  | { type: "HOST"; host: HostProbeProps }
  | { type: "HEARTBEAT"; heartbeat: HeartbeatProbeProps };

export class ProbeConfiguration extends ValueObject<ProbeProps> {
  public get type(): "HTTP" | "PING" | "HOST" | "HEARTBEAT" {
    return this.props.type;
  }

  public get http(): HttpProbeProps | undefined {
    return this.props.type === "HTTP" ? this.props.http : undefined;
  }

  public get ping(): PingProbeProps | undefined {
    return this.props.type === "PING" ? this.props.ping : undefined;
  }

  public get host(): HostProbeProps | undefined {
    return this.props.type === "HOST" ? this.props.host : undefined;
  }

  public get heartbeat(): HeartbeatProbeProps | undefined {
    return this.props.type === "HEARTBEAT" ? this.props.heartbeat : undefined;
  }

  public static createHttp(props: HttpProbeProps): ProbeConfiguration {
    if (!props.url) {
      throw new Error("URL is required for HTTP probe.");
    }
    try {
      new URL(props.url);
    } catch {
      throw new Error(`Invalid URL: ${props.url}`);
    }
    if (props.timeoutMs <= 0) {
      throw new Error("Timeout must be a positive integer.");
    }
    return new ProbeConfiguration({
      type: "HTTP",
      http: {
        url: props.url,
        method: props.method || "GET",
        headers: props.headers || {},
        body: props.body,
        timeoutMs: props.timeoutMs || 5000,
        authProfileId: props.authProfileId,
      },
    });
  }

  public static createPing(props: PingProbeProps): ProbeConfiguration {
    if (!props.host) {
      throw new Error("Host is required for PING probe.");
    }
    if (props.timeoutMs <= 0) {
      throw new Error("Timeout must be a positive integer.");
    }
    return new ProbeConfiguration({
      type: "PING",
      ping: {
        host: props.host,
        timeoutMs: props.timeoutMs || 5000,
        port: props.port,
      },
    });
  }

  public static createHost(props: HostProbeProps): ProbeConfiguration {
    if (!props.url) {
      throw new Error("URL is required for HOST probe.");
    }
    try {
      new URL(props.url);
    } catch {
      throw new Error(`Invalid URL: ${props.url}`);
    }
    if (props.timeoutMs <= 0) {
      throw new Error("Timeout must be a positive integer.");
    }
    return new ProbeConfiguration({
      type: "HOST",
      host: {
        url: props.url,
        token: props.token || "",
        timeoutMs: props.timeoutMs || 5000,
      },
    });
  }

  public static createHeartbeat(props: HeartbeatProbeProps): ProbeConfiguration {
    if (!props.token) {
      throw new Error("Token is required for HEARTBEAT probe.");
    }
    if (!props.expectedIntervalSeconds || props.expectedIntervalSeconds <= 0) {
      throw new Error("Expected interval must be a positive integer.");
    }
    return new ProbeConfiguration({
      type: "HEARTBEAT",
      heartbeat: {
        token: props.token,
        expectedIntervalSeconds: props.expectedIntervalSeconds || 3600,
        gracePeriodSeconds: props.gracePeriodSeconds ?? 300,
        lastPingAt: props.lastPingAt,
      },
    });
  }

  public static create(type: string, props: any): ProbeConfiguration {
    if (type === "HTTP") {
      return ProbeConfiguration.createHttp(props.http || props);
    }
    if (type === "PING") {
      return ProbeConfiguration.createPing(props.ping || props);
    }
    if (type === "HOST") {
      return ProbeConfiguration.createHost(props.host || props);
    }
    if (type === "HEARTBEAT") {
      return ProbeConfiguration.createHeartbeat(props.heartbeat || props);
    }
    throw new Error(`Unknown probe type: ${type}`);
  }
}

