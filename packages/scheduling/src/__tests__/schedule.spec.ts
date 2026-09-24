import { describe, it, expect, beforeEach } from "vitest";
import { Schedule, ScheduleId } from "../domain/model/schedule.js";
import { ScheduleRepository } from "../domain/ports/schedule-repository.js";
import { SchedulerGateway } from "../domain/ports/scheduler-gateway.js";
import { RegisterScheduleUseCase } from "../application/use-cases/register-schedule.js";
import { PauseScheduleUseCase } from "../application/use-cases/pause-schedule.js";
import { ResumeScheduleUseCase } from "../application/use-cases/resume-schedule.js";
import { OnMonitorConfigured } from "../application/event-handlers/on-monitor-configured.js";
import { OnMonitorStatusChanged } from "../application/event-handlers/on-monitor-status-changed.js";
import { MonitorConfigured, MonitorStatusChanged } from "@monitor/monitoring";

// In-memory mock for repository
class InMemoryScheduleRepository implements ScheduleRepository {
  private readonly items = new Map<string, Schedule>();

  public async save(schedule: Schedule): Promise<void> {
    const key = `${schedule.targetId}:${schedule.targetType}`;
    this.items.set(key, schedule);
  }

  public async findByTarget(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<Schedule | null> {
    const key = `${targetId}:${targetType}`;
    return this.items.get(key) || null;
  }
}

// In-memory mock for scheduler gateway
class InMemorySchedulerGateway implements SchedulerGateway {
  public readonly scheduled = new Map<string, Schedule>();

  public async schedule(schedule: Schedule): Promise<void> {
    const key = `${schedule.targetId}:${schedule.targetType}`;
    this.scheduled.set(key, schedule);
  }

  public async unschedule(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<void> {
    const key = `${targetId}:${targetType}`;
    this.scheduled.delete(key);
  }
}

describe("Scheduling Context Unit Tests", () => {
  let repository: InMemoryScheduleRepository;
  let gateway: InMemorySchedulerGateway;

  beforeEach(() => {
    repository = new InMemoryScheduleRepository();
    gateway = new InMemorySchedulerGateway();
  });

  describe("Schedule Entity", () => {
    it("should create a new schedule", () => {
      const id = ScheduleId.generate();
      const schedule = Schedule.create(id, "monitor-1", "MONITOR", null, 60);

      expect(schedule.id.equals(id)).toBe(true);
      expect(schedule.targetId).toBe("monitor-1");
      expect(schedule.targetType).toBe("MONITOR");
      expect(schedule.cron).toBeNull();
      expect(schedule.intervalSeconds).toBe(60);
      expect(schedule.isActive).toBe(true);
    });

    it("should throw error if neither cron nor interval is provided", () => {
      expect(() => {
        Schedule.create(ScheduleId.generate(), "monitor-1", "MONITOR", null, null);
      }).toThrow();
    });

    it("should allow deactivation and reactivation", () => {
      const schedule = Schedule.create(ScheduleId.generate(), "monitor-1", "MONITOR", null, 60);

      schedule.deactivate();
      expect(schedule.isActive).toBe(false);

      schedule.activate();
      expect(schedule.isActive).toBe(true);
    });
  });

  describe("Use Cases", () => {
    it("should register a new schedule via RegisterScheduleUseCase", async () => {
      const useCase = new RegisterScheduleUseCase(repository, gateway);

      const schedule = await useCase.execute({
        targetId: "monitor-1",
        targetType: "MONITOR",
        cron: null,
        intervalSeconds: 30,
      });

      expect(schedule.targetId).toBe("monitor-1");
      expect(schedule.intervalSeconds).toBe(30);

      const saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved).not.toBeNull();
      expect(saved?.intervalSeconds).toBe(30);

      const inGateway = gateway.scheduled.get("monitor-1:MONITOR");
      expect(inGateway).not.toBeUndefined();
    });

    it("should pause a schedule via PauseScheduleUseCase", async () => {
      const register = new RegisterScheduleUseCase(repository, gateway);
      const pause = new PauseScheduleUseCase(repository, gateway);

      await register.execute({
        targetId: "monitor-1",
        targetType: "MONITOR",
        cron: null,
        intervalSeconds: 30,
      });

      await pause.execute({ targetId: "monitor-1", targetType: "MONITOR" });

      const saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved?.isActive).toBe(false);

      const inGateway = gateway.scheduled.get("monitor-1:MONITOR");
      expect(inGateway).toBeUndefined();
    });

    it("should resume a schedule via ResumeScheduleUseCase", async () => {
      const register = new RegisterScheduleUseCase(repository, gateway);
      const pause = new PauseScheduleUseCase(repository, gateway);
      const resume = new ResumeScheduleUseCase(repository, gateway);

      await register.execute({
        targetId: "monitor-1",
        targetType: "MONITOR",
        cron: null,
        intervalSeconds: 30,
      });

      await pause.execute({ targetId: "monitor-1", targetType: "MONITOR" });
      await resume.execute({ targetId: "monitor-1", targetType: "MONITOR" });

      const saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved?.isActive).toBe(true);

      const inGateway = gateway.scheduled.get("monitor-1:MONITOR");
      expect(inGateway).not.toBeUndefined();
    });
  });

  describe("Event Handlers", () => {
    it("should register schedule on OnMonitorConfigured", async () => {
      const registerUseCase = new RegisterScheduleUseCase(repository, gateway);
      const handler = new OnMonitorConfigured(registerUseCase);

      const event = new MonitorConfigured(
        "monitor-1",
        "Test Monitor",
        "HTTP",
        {},
        { intervalSeconds: 45 },
        [],
        {}
      );

      await handler.handle(event);

      const saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved).not.toBeNull();
      expect(saved?.intervalSeconds).toBe(45);
    });

    it("should pause/resume schedule on OnMonitorStatusChanged", async () => {
      const registerUseCase = new RegisterScheduleUseCase(repository, gateway);
      const pauseUseCase = new PauseScheduleUseCase(repository, gateway);
      const resumeUseCase = new ResumeScheduleUseCase(repository, gateway);
      
      const statusHandler = new OnMonitorStatusChanged(pauseUseCase, resumeUseCase);

      // 1. Register active schedule
      await registerUseCase.execute({
        targetId: "monitor-1",
        targetType: "MONITOR",
        cron: null,
        intervalSeconds: 30,
      });

      // 2. Simulate monitor going to PAUSED
      const pauseEvent = new MonitorStatusChanged("monitor-1", "UP", "PAUSED");
      await statusHandler.handle(pauseEvent);

      let saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved?.isActive).toBe(false);
      expect(gateway.scheduled.has("monitor-1:MONITOR")).toBe(false);

      // 3. Simulate monitor resuming to UP
      const resumeEvent = new MonitorStatusChanged("monitor-1", "PAUSED", "UP");
      await statusHandler.handle(resumeEvent);

      saved = await repository.findByTarget("monitor-1", "MONITOR");
      expect(saved?.isActive).toBe(true);
      expect(gateway.scheduled.has("monitor-1:MONITOR")).toBe(true);
    });
  });
});
