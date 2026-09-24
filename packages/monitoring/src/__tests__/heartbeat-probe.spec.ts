import { describe, it, expect, vi } from "vitest";
import { Monitor } from "../domain/model/monitor/monitor.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { MonitorType } from "../domain/model/monitor/monitor-type.js";
import { ProbeConfiguration } from "../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../domain/model/monitor/schedule.js";
import { AlarmPolicy } from "../domain/model/monitor/alarm-policy.js";
import { MetricRule } from "../domain/model/monitor/metric-rule.js";
import { HeartbeatProbeExecutor } from "../infrastructure/adapters/heartbeat-probe-executor.js";
import { ProcessHeartbeatUseCase } from "../application/use-cases/process-heartbeat.js";
import { MonitorRepository } from "../domain/ports/monitor-repository.js";
import { CheckExecutionRepository } from "../domain/ports/check-execution-repository.js";
import { DomainEventBus } from "@monitor/shared-kernel";

describe("Heartbeat Probe & Ingestion", () => {
  const token = "hb_sec_test_12345";
  const hbProbe = ProbeConfiguration.createHeartbeat({
    token,
    expectedIntervalSeconds: 3600, // 1h
    gracePeriodSeconds: 300, // 5m
  });
  const defaultSchedule = Schedule.create({ intervalSeconds: 3600 });
  const defaultPolicy = AlarmPolicy.create({ consecutiveFailures: 1 });

  describe("HeartbeatProbeExecutor", () => {
    const executor = new HeartbeatProbeExecutor();

    it("should fail if no ping has ever been received", async () => {
      const result = await executor.execute(hbProbe);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("In attesa del primo heartbeat");
    });

    it("should succeed if last ping was within the allowed window", async () => {
      const recentProbe = ProbeConfiguration.createHeartbeat({
        token,
        expectedIntervalSeconds: 3600,
        gracePeriodSeconds: 300,
        lastPingAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 min fa
      });

      const result = await executor.execute(recentProbe);
      expect(result.error).toBeUndefined();
      expect(result.statusCode).toBe(200);
    });

    it("should fail if heartbeat is expired", async () => {
      const expiredProbe = ProbeConfiguration.createHeartbeat({
        token,
        expectedIntervalSeconds: 3600,
        gracePeriodSeconds: 300,
        lastPingAt: new Date(Date.now() - 1000 * (3600 + 400)).toISOString(), // Oltre la grazia
      });

      const result = await executor.execute(expiredProbe);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Heartbeat scaduto");
    });
  });

  describe("ProcessHeartbeatUseCase", () => {
    it("should record ping and update monitor status to UP with extracted metrics", async () => {
      const monitor = Monitor.create(
        MonitorId.generate(),
        "Backup Server PMI",
        MonitorType.HEARTBEAT,
        hbProbe,
        defaultSchedule,
        [],
        defaultPolicy,
        undefined,
        [MetricRule.create({ property: "backup_status", operator: "EQUALS", value: "OK" })]
      );

      const monitorRepo: MonitorRepository = {
        findById: vi.fn().mockResolvedValue(monitor),
        findByHeartbeatToken: vi.fn().mockResolvedValue(monitor),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };

      const checkExecutionRepo: CheckExecutionRepository = {
        save: vi.fn().mockResolvedValue(undefined),
      };

      const publishedEvents: any[] = [];
      const eventBus: DomainEventBus = {
        publish: vi.fn().mockImplementation(async (e) => publishedEvents.push(e)),
        subscribe: vi.fn(),
      };

      const useCase = new ProcessHeartbeatUseCase(monitorRepo, checkExecutionRepo, eventBus);

      const payload = JSON.stringify({
        backup_status: "OK",
        size_mb: 450,
        files_count: 120,
      });

      const execution = await useCase.execute({
        token,
        body: payload,
        responseTimeMs: 45,
      });

      expect(execution).toBeDefined();
      expect(execution?.status).toBe("UP");
      expect(execution?.dataAlertLevel).toBe("NORMAL");
      expect(execution?.extractedData?.values).toEqual({
        backup_status: "OK",
        size_mb: 450,
        files_count: 120,
      });

      expect(monitor.status.value).toBe("UP");
      expect(monitor.dataHealthStatus.value).toBe("OK");
      expect(monitor.probeConfiguration.heartbeat?.lastPingAt).toBeDefined();

      expect(checkExecutionRepo.save).toHaveBeenCalledTimes(1);
      expect(monitorRepo.save).toHaveBeenCalledTimes(1);
      expect(publishedEvents.some((e) => e.eventType === "CheckExecuted")).toBe(true);
    });

    it("should trigger data health CRITICAL if metric rule fails on payload", async () => {
      const monitor = Monitor.create(
        MonitorId.generate(),
        "Export Fatture",
        MonitorType.HEARTBEAT,
        hbProbe,
        defaultSchedule,
        [],
        defaultPolicy,
        undefined,
        [MetricRule.create({ property: "file_size_bytes", operator: "GREATER_THAN", value: "100" })]
      );

      const monitorRepo: MonitorRepository = {
        findById: vi.fn().mockResolvedValue(monitor),
        findByHeartbeatToken: vi.fn().mockResolvedValue(monitor),
        save: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };

      const checkExecutionRepo: CheckExecutionRepository = {
        save: vi.fn().mockResolvedValue(undefined),
      };


      const eventBus: DomainEventBus = {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn(),
      };

      const useCase = new ProcessHeartbeatUseCase(monitorRepo, checkExecutionRepo, eventBus);

      const execution = await useCase.execute({
        token,
        body: JSON.stringify({ file_size_bytes: 0 }), // 0 bytes non supera GREATER_THAN 100
      });

      expect(execution?.status).toBe("UP");
      expect(execution?.dataAlertLevel).toBe("CRITICAL");
      expect(monitor.dataHealthStatus.value).toBe("CRITICAL");
    });
  });
});
