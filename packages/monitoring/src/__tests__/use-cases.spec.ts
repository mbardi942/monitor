import { describe, it, expect } from "vitest";
import { CreateMonitorUseCase } from "../application/use-cases/create-monitor.js";
import { ExecuteCheckUseCase } from "../application/use-cases/execute-check.js";
import { InMemoryEventBus } from "@monitor/event-bus";
import { MonitorRepository } from "../domain/ports/monitor-repository.js";
import { CheckExecutionRepository } from "../domain/ports/check-execution-repository.js";
import { ProbeExecutor } from "../domain/ports/probe-executor.js";
import { ProbeExecutorRegistry } from "../domain/ports/probe-executor-registry.js";
import { Monitor } from "../domain/model/monitor/monitor.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { CheckExecution } from "../domain/model/check-execution/check-execution.js";
import { CheckResult } from "../domain/model/check-execution/check-result.js";
import { AssertionEngine } from "../domain/services/assertion-engine.js";
import { DomainEvent } from "@monitor/shared-kernel";

// Mock Repositories
class InMemoryMonitorRepository implements MonitorRepository {
  public readonly items = new Map<string, Monitor>();
  public async findById(id: MonitorId): Promise<Monitor | null> {
    return this.items.get(id.toString()) || null;
  }
  public async findByHeartbeatToken(token: string): Promise<Monitor | null> {
    for (const m of this.items.values()) {
      if (m.probeConfiguration.heartbeat?.token === token) return m;
    }
    return null;
  }
  public async save(monitor: Monitor): Promise<void> {
    this.items.set(monitor.id.toString(), monitor);
  }
  public async delete(id: MonitorId): Promise<void> {
    this.items.delete(id.toString());
  }
}


class InMemoryCheckExecutionRepository implements CheckExecutionRepository {
  public readonly items: CheckExecution[] = [];
  public async save(checkExecution: CheckExecution): Promise<void> {
    this.items.push(checkExecution);
  }
}

// Mock Probe Executor
class MockProbeExecutor implements ProbeExecutor {
  public resultToReturn: CheckResult = CheckResult.createSuccess(100, 200, {}, "OK");
  public async execute(): Promise<CheckResult> {
    return this.resultToReturn;
  }
}

class MockProbeExecutorRegistry implements ProbeExecutorRegistry {
  constructor(private readonly executor: ProbeExecutor) {}
  public getExecutor(type: string): ProbeExecutor {
    return this.executor;
  }
}

describe("Monitoring Use Cases", () => {
  it("should create a monitor, persist it, and publish domain events", async () => {
    const monitorRepo = new InMemoryMonitorRepository();
    const eventBus = new InMemoryEventBus();
    const useCase = new CreateMonitorUseCase(monitorRepo, eventBus);

    const publishedEvents: DomainEvent[] = [];
    eventBus.subscribe("MonitorCreated", (e) => { publishedEvents.push(e); });
    eventBus.subscribe("MonitorConfigured", (e) => { publishedEvents.push(e); });

    const monitor = await useCase.execute({
      name: "My API",
      type: "HTTP",
      probeConfiguration: {
        type: "HTTP",
        http: { url: "https://my-api.com/health", method: "GET", timeoutMs: 3000 },
      },
      schedule: { intervalSeconds: 30 },
      assertionRules: [
        { target: "STATUS_CODE", operator: "EQUALS", value: "200" },
      ],
      alarmPolicy: { consecutiveFailures: 2 },
    });

    expect(monitorRepo.items.size).toBe(1);
    const persisted = await monitorRepo.findById(monitor.id);
    expect(persisted?.name).toBe("My API");

    expect(publishedEvents.length).toBe(2);
    expect(publishedEvents[0].eventType).toBe("MonitorCreated");
    expect(publishedEvents[1].eventType).toBe("MonitorConfigured");
  });

  it("should execute check, verify assertions, and transition monitor status", async () => {
    const monitorRepo = new InMemoryMonitorRepository();
    const checkRepo = new InMemoryCheckExecutionRepository();
    const probeExecutor = new MockProbeExecutor();
    const assertionEngine = new AssertionEngine();
    const eventBus = new InMemoryEventBus();

    // Prepare a monitor in repository
    const createUseCase = new CreateMonitorUseCase(monitorRepo, eventBus);
    const monitor = await createUseCase.execute({
      name: "API to Check",
      type: "HTTP",
      probeConfiguration: {
        type: "HTTP",
        http: { url: "https://example.com", method: "GET", timeoutMs: 2000 },
      },
      schedule: { intervalSeconds: 30 },
      assertionRules: [
        { target: "STATUS_CODE", operator: "EQUALS", value: "200" },
      ],
      alarmPolicy: { consecutiveFailures: 3 },
    });

    const registry = new MockProbeExecutorRegistry(probeExecutor);
    const executeCheckUseCase = new ExecuteCheckUseCase(
      monitorRepo,
      checkRepo,
      registry,
      assertionEngine,
      eventBus
    );

    const publishedEvents: DomainEvent[] = [];
    eventBus.subscribe("CheckExecuted", (e) => { publishedEvents.push(e); });
    eventBus.subscribe("MonitorStatusChanged", (e) => { publishedEvents.push(e); });

    // Scenario 1: Successful check (UP)
    probeExecutor.resultToReturn = CheckResult.createSuccess(150, 200, {}, "OK");
    let execution = await executeCheckUseCase.execute({ monitorId: monitor.id.toString() });

    expect(execution).not.toBeNull();
    expect(execution?.status).toBe("UP");
    expect(checkRepo.items.length).toBe(1);
    expect(publishedEvents.some(e => e.eventType === "CheckExecuted")).toBe(true);
    // Monitor status was already UP, so no status change is expected
    expect(publishedEvents.some(e => e.eventType === "MonitorStatusChanged")).toBe(false);

    // Scenario 2: Failed check (DOWN)
    publishedEvents.length = 0;
    probeExecutor.resultToReturn = CheckResult.createSuccess(200, 500, {}, "Error"); // Status 500 fails assertion (expected 200)
    execution = await executeCheckUseCase.execute({ monitorId: monitor.id.toString() });

    expect(execution).not.toBeNull();
    expect(execution?.status).toBe("DOWN");
    expect(checkRepo.items.length).toBe(2);

    const updatedMonitor = await monitorRepo.findById(monitor.id);
    expect(updatedMonitor?.status.value).toBe("DOWN");

    expect(publishedEvents.some(e => e.eventType === "CheckExecuted")).toBe(true);
    // Monitor status transitioned from UP to DOWN, so event is expected
    expect(publishedEvents.some(e => e.eventType === "MonitorStatusChanged")).toBe(true);
    const statusChangedEvent = publishedEvents.find(e => e.eventType === "MonitorStatusChanged") as any;
    expect(statusChangedEvent.oldStatus).toBe("UP");
    expect(statusChangedEvent.newStatus).toBe("DOWN");
  });

  it("should execute check for HOST monitor, parse body and populate extractedData", async () => {
    const monitorRepo = new InMemoryMonitorRepository();
    const checkRepo = new InMemoryCheckExecutionRepository();
    const probeExecutor = new MockProbeExecutor();
    const registry = new MockProbeExecutorRegistry(probeExecutor);
    const assertionEngine = new AssertionEngine();
    const eventBus = new InMemoryEventBus();

    const createUseCase = new CreateMonitorUseCase(monitorRepo, eventBus);
    const monitor = await createUseCase.execute({
      name: "Host Resources Monitor",
      type: "HOST",
      probeConfiguration: {
        type: "HOST",
        host: { url: "http://192.168.1.50:9500/metrics", token: "secret-token", timeoutMs: 3000 },
      },
      schedule: { intervalSeconds: 60 },
      assertionRules: [],
      metricRules: [
        { property: "cpu.usagePercent", operator: "LESS_THAN", value: "90" },
      ],
      alarmPolicy: { consecutiveFailures: 3 },
    });

    const executeCheckUseCase = new ExecuteCheckUseCase(
      monitorRepo,
      checkRepo,
      registry,
      assertionEngine,
      eventBus
    );

    // Mock response body with JSON metrics
    probeExecutor.resultToReturn = CheckResult.createSuccess(
      120,
      200,
      { "content-type": "application/json" },
      JSON.stringify({ cpu: { usagePercent: 45 }, ram: { usagePercent: 78 } })
    );

    const execution = await executeCheckUseCase.execute({ monitorId: monitor.id.toString() });

    expect(execution).not.toBeNull();
    expect(execution?.status).toBe("UP");
    expect(execution?.probeHealth).toBe("HEALTHY");
    expect(execution?.extractedData).toBeDefined();
    expect(execution?.extractedData?.values).toEqual({
      cpu: { usagePercent: 45 },
      ram: { usagePercent: 78 },
    });
  });
});
