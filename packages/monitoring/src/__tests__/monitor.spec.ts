import { describe, it, expect } from "vitest";
import { Monitor } from "../domain/model/monitor/monitor.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { MonitorType } from "../domain/model/monitor/monitor-type.js";
import { MonitorStatus } from "../domain/model/monitor/monitor-status.js";
import { ProbeConfiguration } from "../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../domain/model/monitor/schedule.js";
import { AssertionRule } from "../domain/model/monitor/assertion-rule.js";
import { AlarmPolicy } from "../domain/model/monitor/alarm-policy.js";
import { DataExtractor } from "../domain/model/monitor/data-extractor.js";

describe("Monitor Aggregate Root", () => {
  const defaultProbe = ProbeConfiguration.createHttp({
    url: "https://example.com/api",
    method: "GET",
    timeoutMs: 3000,
  });
  const defaultSchedule = Schedule.create({ intervalSeconds: 60 });
  const defaultRules = [
    AssertionRule.create({ target: "STATUS_CODE", operator: "EQUALS", value: "200" }),
  ];
  const defaultPolicy = AlarmPolicy.create({ consecutiveFailures: 3 });

  it("should create a new active monitor with appropriate events", () => {
    const id = MonitorId.generate();
    const monitor = Monitor.create(
      id,
      "Test Service",
      MonitorType.HTTP,
      defaultProbe,
      defaultSchedule,
      defaultRules,
      defaultPolicy
    );

    expect(monitor.id.equals(id)).toBe(true);
    expect(monitor.name).toBe("Test Service");
    expect(monitor.status.value).toBe("UP");
    expect(monitor.type.value).toBe("HTTP");

    const events = monitor.pullDomainEvents();
    expect(events.length).toBe(2);
    expect(events[0].eventType).toBe("MonitorCreated");
    expect(events[1].eventType).toBe("MonitorConfigured");
  });

  it("should allow configuration changes and raise MonitorConfigured event", () => {
    const id = MonitorId.generate();
    const monitor = Monitor.create(
      id,
      "Test Service",
      MonitorType.HTTP,
      defaultProbe,
      defaultSchedule,
      defaultRules,
      defaultPolicy
    );

    // Remove initial events
    monitor.pullDomainEvents();

    const newProbe = ProbeConfiguration.createHttp({
      url: "https://example.org/health",
      method: "POST",
      timeoutMs: 5000,
    });

    monitor.configure("Updated Service", newProbe, defaultSchedule, defaultRules, defaultPolicy);

    expect(monitor.name).toBe("Updated Service");
    expect(monitor.probeConfiguration.http?.url).toBe("https://example.org/health");

    const events = monitor.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("MonitorConfigured");
  });

  it("should transition states properly (UP -> PAUSED -> UP)", () => {
    const id = MonitorId.generate();
    const monitor = Monitor.create(
      id,
      "Test Service",
      MonitorType.HTTP,
      defaultProbe,
      defaultSchedule,
      defaultRules,
      defaultPolicy
    );

    monitor.pullDomainEvents();

    // Pause
    monitor.pause();
    expect(monitor.status.value).toBe("PAUSED");

    let events = monitor.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("MonitorStatusChanged");
    expect((events[0] as any).oldStatus).toBe("UP");
    expect((events[0] as any).newStatus).toBe("PAUSED");

    // Resume
    monitor.resume();
    expect(monitor.status.value).toBe("UP");

    events = monitor.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("MonitorStatusChanged");
  });

  it("should block invalid transitions (e.g., direct state update violation)", () => {
    const id = MonitorId.generate();
    const monitor = Monitor.create(
      id,
      "Test",
      MonitorType.HTTP,
      defaultProbe,
      defaultSchedule,
      defaultRules,
      defaultPolicy
    );

    // Set to PAUSED
    monitor.pause();

    // Cannot transition directly from PAUSED to DOWN (must resume to UP first)
    expect(() => monitor.updateStatus(MonitorStatus.DOWN)).toThrow(
      "Cannot transition monitor status from PAUSED to DOWN"
    );
  });

  describe("Data Extractor Validations", () => {
    const validExtractor = DataExtractor.create({
      schema: {
        type: "SINGLE_VALUE",
        valuePath: "status.health",
        label: "Health",
      },
      displayHint: "SINGLE_VALUE",
    });

    it("should allow data extractor for HOST monitors", () => {
      const hostProbe = ProbeConfiguration.createHost({
        url: "http://127.0.0.1:9500/metrics",
        token: "",
        timeoutMs: 3000,
      });

      const monitor = Monitor.create(
        MonitorId.generate(),
        "Host Monitor with Extractor",
        MonitorType.HOST,
        hostProbe,
        defaultSchedule,
        defaultRules,
        defaultPolicy,
        validExtractor
      );

      expect(monitor.dataExtractor).toBe(validExtractor);
    });

    it("should block data extractor for PING monitors", () => {
      const pingProbe = ProbeConfiguration.createPing({
        host: "8.8.8.8",
        timeoutMs: 2000,
      });

      expect(() =>
        Monitor.create(
          MonitorId.generate(),
          "Ping Monitor with Extractor",
          MonitorType.PING,
          pingProbe,
          defaultSchedule,
          defaultRules,
          defaultPolicy,
          validExtractor
        )
      ).toThrow("PING monitors cannot have a data extractor");
    });
  });
});
