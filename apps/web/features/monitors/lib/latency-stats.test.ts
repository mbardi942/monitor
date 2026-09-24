import { describe, it, expect } from "vitest";
import { calculateLatencyStats } from "./latency-stats";

describe("calculateLatencyStats", () => {
  it("ritorna valori di default con array vuoto", () => {
    const stats = calculateLatencyStats([]);
    expect(stats.totalChecks).toBe(0);
    expect(stats.successRate).toBe(100);
    expect(stats.avgLatencyMs).toBeNull();
    expect(stats.p50LatencyMs).toBeNull();
    expect(stats.p95LatencyMs).toBeNull();
    expect(stats.consecutiveFailures).toBe(0);
  });

  it("calcola correttamente medie e percentili escludendo i check con esito DOWN", () => {
    const executions = [
      { timestamp: "2026-08-30T10:00:00Z", status: "UP", responseTimeMs: 100 },
      { timestamp: "2026-08-30T10:01:00Z", status: "DOWN", responseTimeMs: 5000 },
      { timestamp: "2026-08-30T10:02:00Z", status: "UP", responseTimeMs: 200 },
      { timestamp: "2026-08-30T10:03:00Z", status: "UP", responseTimeMs: 300 },
    ];

    const stats = calculateLatencyStats(executions);
    expect(stats.totalChecks).toBe(4);
    expect(stats.successChecks).toBe(3);
    expect(stats.failedChecks).toBe(1);
    expect(stats.successRate).toBe(75);
    // Solo 100, 200, 300 considerati per la latenza: media = 200
    expect(stats.avgLatencyMs).toBe(200);
    expect(stats.minLatencyMs).toBe(100);
    expect(stats.maxLatencyMs).toBe(300);
    expect(stats.p50LatencyMs).toBe(200);
    expect(stats.consecutiveFailures).toBe(0); // Il primo è UP
  });

  it("calcola correttamente i fallimenti consecutivi recenti", () => {
    const executions = [
      { timestamp: "2026-08-30T10:00:00Z", status: "DOWN", responseTimeMs: 0 },
      { timestamp: "2026-08-30T09:59:00Z", status: "DOWN", responseTimeMs: 0 },
      { timestamp: "2026-08-30T09:58:00Z", status: "UP", responseTimeMs: 150 },
    ];

    const stats = calculateLatencyStats(executions);
    expect(stats.consecutiveFailures).toBe(2);
    expect(stats.successChecks).toBe(1);
    expect(stats.avgLatencyMs).toBe(150);
  });
});
