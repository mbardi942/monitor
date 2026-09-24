import { describe, it, expect } from "vitest";
import { Alarm } from "../domain/model/alarm/alarm.js";
import { AlarmId } from "../domain/model/alarm/alarm-id.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { CheckExecutionId } from "../domain/model/check-execution/check-execution-id.js";
import { Severity } from "../domain/model/alarm/severity.js";
import { AlarmConfirmationStatus } from "../domain/model/alarm/alarm-confirmation-status.js";
import { AlarmPeriod } from "../domain/model/alarm/alarm-period.js";
import { FailureAccumulator } from "../domain/model/alarm/failure-accumulator.js";
import { AlarmPolicy } from "../domain/model/monitor/alarm-policy.js";
import { AlarmPolicyEvaluator } from "../domain/services/alarm-policy-evaluator.js";
import { StatusTransitionService } from "../domain/services/status-transition-service.js";
import { MonitorStatus } from "../domain/model/monitor/monitor-status.js";

describe("Alarm Value Objects & Aggregate Root", () => {
  it("should create severity and compare correctly", () => {
    const info = Severity.INFO;
    const warning = Severity.WARNING;
    const critical = Severity.CRITICAL;

    expect(info.value).toBe("INFO");
    expect(warning.value).toBe("WARNING");
    expect(critical.value).toBe("CRITICAL");

    expect(Severity.create("info").equals(info)).toBe(true);
    expect(Severity.create("warning").equals(warning)).toBe(true);
    expect(Severity.create("critical").equals(critical)).toBe(true);
    expect(() => Severity.create("invalid")).toThrow("Invalid severity: invalid");
  });

  it("should create alarm confirmation status correctly", () => {
    expect(AlarmConfirmationStatus.OPEN.value).toBe("OPEN");
    expect(AlarmConfirmationStatus.CONFIRMED.value).toBe("CONFIRMED");
    expect(AlarmConfirmationStatus.create("resolved").equals(AlarmConfirmationStatus.RESOLVED)).toBe(true);
  });

  it("should increment failure accumulator correctly", () => {
    const firstFailure = new Date(Date.now() - 10000);
    const acc = FailureAccumulator.create({ consecutiveFailureCount: 1, firstFailureAt: firstFailure });
    
    expect(acc.consecutiveFailureCount).toBe(1);
    expect(acc.firstFailureAt).toBe(firstFailure);

    const acc2 = acc.increment();
    expect(acc2.consecutiveFailureCount).toBe(2);
    expect(acc2.firstFailureAt).toBe(firstFailure);

    const acc3 = acc2.reset();
    expect(acc3.consecutiveFailureCount).toBe(0);
    expect(acc3.firstFailureAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 100);
  });

  it("should handle alarm lifecycle correctly (raise -> accumulate -> confirm -> resolve)", () => {
    const alarmId = AlarmId.generate();
    const monitorId = MonitorId.generate();
    const triggerCheckId = CheckExecutionId.generate();
    
    // 1. Raise
    const alarm = Alarm.raise(alarmId, monitorId, Severity.CRITICAL, triggerCheckId);
    
    expect(alarm.id.equals(alarmId)).toBe(true);
    expect(alarm.monitorId.equals(monitorId)).toBe(true);
    expect(alarm.severity.equals(Severity.CRITICAL)).toBe(true);
    expect(alarm.confirmationStatus.value).toBe("OPEN");
    expect(alarm.failureAccumulator.consecutiveFailureCount).toBe(1);
    expect(alarm.triggerCheckExecutionId.equals(triggerCheckId)).toBe(true);

    let events = alarm.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("AlarmRaised");

    // 2. Accumulate
    alarm.accumulateFailure(CheckExecutionId.generate());
    expect(alarm.failureAccumulator.consecutiveFailureCount).toBe(2);

    // 3. Confirm
    alarm.confirm("Test Monitor", ["dashboard-1"], { details: "Status 500" });
    expect(alarm.confirmationStatus.value).toBe("CONFIRMED");
    expect(alarm.period.confirmedAt).toBeDefined();

    events = alarm.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("AlarmConfirmed");
    expect((events[0] as any).monitorName).toBe("Test Monitor");
    expect((events[0] as any).dashboardIds).toEqual(["dashboard-1"]);
    expect((events[0] as any).extractedDataSummary).toEqual({ details: "Status 500" });

    // 4. Mark Notified
    alarm.markNotified();
    expect(alarm.confirmationStatus.value).toBe("NOTIFIED");
    expect(alarm.period.notifiedAt).toBeDefined();

    events = alarm.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("AlarmNotified");

    // 5. Resolve
    alarm.resolve("Test Monitor", true);
    expect(alarm.confirmationStatus.value).toBe("RESOLVED");
    expect(alarm.period.resolvedAt).toBeDefined();

    events = alarm.pullDomainEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("AlarmResolved");
    expect((events[0] as any).durationMs).toBeGreaterThanOrEqual(0);
    expect((events[0] as any).wasNotified).toBe(true);
    expect((events[0] as any).recoveryEnabled).toBe(true);
  });

  it("should escalate severity correctly", () => {
    const alarm = Alarm.raise(AlarmId.generate(), MonitorId.generate(), Severity.INFO, CheckExecutionId.generate());
    
    expect(alarm.severity.value).toBe("INFO");
    alarm.escalate(Severity.WARNING);
    expect(alarm.severity.value).toBe("WARNING");

    let events = alarm.pullDomainEvents();
    expect(events.length).toBe(2); // AlarmRaised + AlarmEscalated
    expect(events[1].eventType).toBe("AlarmEscalated");
    expect((events[1] as any).previousSeverity).toBe("INFO");
    expect((events[1] as any).newSeverity).toBe("WARNING");

    alarm.escalate(Severity.CRITICAL);
    expect(alarm.severity.value).toBe("CRITICAL");

    expect(() => alarm.escalate(Severity.INFO)).toThrow("Cannot escalate alarm");
  });
});

describe("AlarmPolicyEvaluator Service", () => {
  const evaluator = new AlarmPolicyEvaluator();

  it("should confirm based on consecutive failures", () => {
    const alarm = Alarm.raise(AlarmId.generate(), MonitorId.generate(), Severity.CRITICAL, CheckExecutionId.generate());
    const policy = AlarmPolicy.create({ consecutiveFailures: 3 });

    // 1 failure (initial raised state)
    expect(evaluator.shouldConfirm(alarm, policy)).toBe(false);

    // 2 failures
    alarm.accumulateFailure(CheckExecutionId.generate());
    expect(evaluator.shouldConfirm(alarm, policy)).toBe(false);

    // 3 failures
    alarm.accumulateFailure(CheckExecutionId.generate());
    expect(evaluator.shouldConfirm(alarm, policy)).toBe(true);
  });

  it("should confirm based on downtime duration", () => {
    const triggerTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const alarm = Alarm.reconstitute(
      AlarmId.generate(),
      MonitorId.generate(),
      Severity.CRITICAL,
      AlarmConfirmationStatus.OPEN,
      AlarmPeriod.create({ openedAt: triggerTime }),
      FailureAccumulator.create({ consecutiveFailureCount: 1, firstFailureAt: triggerTime }),
      CheckExecutionId.generate(),
      triggerTime,
      triggerTime
    );

    const policy = AlarmPolicy.create({ consecutiveFailures: 5, downtimeDurationMinutes: 5 });

    // Meets downtime duration (10 mins > 5 mins) even though consecutive failures (1) is less than threshold (5)
    expect(evaluator.shouldConfirm(alarm, policy)).toBe(true);
  });
});

describe("StatusTransitionService Domain Service", () => {
  const service = new StatusTransitionService();

  it("should transition status correctly", () => {
    const up = MonitorStatus.UP;
    const down = MonitorStatus.DOWN;
    const paused = MonitorStatus.PAUSED;

    expect(service.determineNextStatus(up, "DOWN").value).toBe("DOWN");
    expect(service.determineNextStatus(down, "UP").value).toBe("UP");
    expect(service.determineNextStatus(paused, "DOWN").value).toBe("PAUSED"); // Paused ignores check status
  });
});
