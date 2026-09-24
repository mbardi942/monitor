import { describe, it, expect, beforeAll, afterAll } from "vitest";
import net from "net";
import { PingProbeExecutor } from "../infrastructure/adapters/ping-probe-executor.js";
import { ProbeConfiguration } from "../domain/model/monitor/probe-configuration.js";

describe("PingProbeExecutor", () => {
  let server: net.Server;
  let serverPort: number;

  beforeAll(() => {
    return new Promise<void>((resolve) => {
      server = net.createServer((socket) => {
        // Chiudi subito la connessione o lascia aperta per test
        socket.end();
      });
      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as net.AddressInfo;
        serverPort = address.port;
        resolve();
      });
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should successfully connect to an active TCP port", async () => {
    const executor = new PingProbeExecutor();
    const config = ProbeConfiguration.createPing({
      host: "127.0.0.1",
      timeoutMs: 1000,
      port: serverPort,
    });

    const result = await executor.execute(config);

    expect(result.error).toBeUndefined();
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain(`Successfully connected to 127.0.0.1:${serverPort}`);
  });

  it("should fail to connect to an inactive TCP port", async () => {
    const executor = new PingProbeExecutor();
    
    // Usiamo una porta che sappiamo essere chiusa
    const inactivePort = serverPort + 10;
    const config = ProbeConfiguration.createPing({
      host: "127.0.0.1",
      timeoutMs: 1000,
      port: inactivePort,
    });

    const result = await executor.execute(config);

    expect(result.error).toBeDefined();
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toContain("Connection failed:");
  });

  it("should fail with timeout on a slow/unreachable connection", async () => {
    const executor = new PingProbeExecutor();
    
    // Per causare un timeout sicuro, possiamo usare un IP non instradabile (es. 10.255.255.1) 
    // con un timeout estremamente basso (es. 50ms)
    const config = ProbeConfiguration.createPing({
      host: "10.255.255.1",
      timeoutMs: 50,
      port: 80,
    });

    const result = await executor.execute(config);

    expect(result.error).toBeDefined();
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(50);
    expect(result.error).toContain("Connection timed out after 50ms");
  });
});
