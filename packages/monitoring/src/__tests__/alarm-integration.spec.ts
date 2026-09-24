import { describe, it, expect } from "vitest";
import { InMemoryEventBus } from "@monitor/event-bus";
import { Alarm } from "../domain/model/alarm/alarm.js";
import { AlarmId } from "../domain/model/alarm/alarm-id.js";
import { MonitorId } from "../domain/model/monitor/monitor-id.js";
import { Dashboard } from "../domain/model/dashboard/dashboard.js";
import { DashboardId } from "../domain/model/dashboard/dashboard-id.js";
import { Monitor } from "../domain/model/monitor/monitor.js";
import { MonitorStatus } from "../domain/model/monitor/monitor-status.js";
import { MonitorType } from "../domain/model/monitor/monitor-type.js";
import { ProbeConfiguration } from "../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../domain/model/monitor/schedule.js";
import { AssertionRule } from "../domain/model/monitor/assertion-rule.js";
import { AlarmPolicy } from "../domain/model/monitor/alarm-policy.js";
import { AlarmRepository } from "../domain/ports/alarm-repository.js";
import { MonitorRepository } from "../domain/ports/monitor-repository.js";
import { DashboardRepository } from "../domain/ports/dashboard-repository.js";
import { AlarmPolicyEvaluator } from "../domain/services/alarm-policy-evaluator.js";
import { DashboardResolverService } from "../domain/services/dashboard-resolver-service.js";
import { OnMonitorStatusChanged } from "../application/event-handlers/on-monitor-status-changed.js";
import { OnAlarmRaised } from "../application/event-handlers/on-alarm-raised.js";
import { OnCheckExecuted } from "../application/event-handlers/on-check-executed.js";
import { ResolveAlarmUseCase } from "../application/use-cases/resolve-alarm.js";
import { CheckExecuted } from "../domain/events/check-executed.js";
import { MonitorStatusChanged } from "../domain/events/monitor-status-changed.js";
import { AlarmRaised } from "../domain/events/alarm-raised.js";
import { AlarmConfirmed } from "../domain/events/alarm-confirmed.js";
import { AlarmResolved } from "../domain/events/alarm-resolved.js";
import { Severity } from "../domain/model/alarm/severity.js";
import { CheckExecutionId } from "../domain/model/check-execution/check-execution-id.js";

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


class InMemoryDashboardRepository implements DashboardRepository {
  public readonly items = new Map<string, Dashboard>();
  public async findById(id: DashboardId): Promise<Dashboard | null> {
    return this.items.get(id.toString()) || null;
  }
  public async save(dashboard: Dashboard): Promise<void> {
    this.items.set(dashboard.id.toString(), dashboard);
  }
  public async findByMonitorId(monitorId: MonitorId): Promise<Dashboard[]> {
    const list: Dashboard[] = [];
    for (const dash of this.items.values()) {
      if (dash.monitorIds.some((id) => id.equals(monitorId))) {
        list.push(dash);
      }
    }
    return list;
  }
}

class InMemoryAlarmRepository implements AlarmRepository {
  public readonly items = new Map<string, Alarm>();
  public async findById(id: AlarmId): Promise<Alarm | null> {
    return this.items.get(id.toString()) || null;
  }
  public async findActiveByMonitorId(monitorId: MonitorId): Promise<Alarm | null> {
    for (const alarm of this.items.values()) {
      if (alarm.monitorId.equals(monitorId) && alarm.confirmationStatus.value !== "RESOLVED") {
        return alarm;
      }
    }
    return null;
  }
  public async save(alarm: Alarm): Promise<void> {
    this.items.set(alarm.id.toString(), alarm);
  }
  public async findHistory(): Promise<Alarm[]> {
    return Array.from(this.items.values());
  }
}

describe("Alarm Integration Flow", () => {
  it("should process consecutive check failures, confirm alarm, and resolve it on success", async () => {
    const eventBus = new InMemoryEventBus();
    const monitorRepo = new InMemoryMonitorRepository();
    const dashboardRepo = new InMemoryDashboardRepository();
    const alarmRepo = new InMemoryAlarmRepository();

    const policyEvaluator = new AlarmPolicyEvaluator();
    const dashboardResolver = new DashboardResolverService(dashboardRepo);

    // Registrazione Event Handler
    const onStatusChanged = new OnMonitorStatusChanged(alarmRepo, monitorRepo, eventBus);
    const onAlarmRaised = new OnAlarmRaised(alarmRepo, monitorRepo, policyEvaluator, dashboardResolver, eventBus);
    const onCheckExecuted = new OnCheckExecuted(alarmRepo, monitorRepo, policyEvaluator, dashboardResolver, eventBus);

    eventBus.subscribe("MonitorStatusChanged", (e) => onStatusChanged.handle(e));
    eventBus.subscribe("AlarmRaised", (e) => onAlarmRaised.handle(e));
    eventBus.subscribe("CheckExecuted", (e) => onCheckExecuted.handle(e));

    // Setup: Crea Dashboard e associa Monitor
    const dashboard = Dashboard.create(DashboardId.generate(), "Main Dashboard", "tenant-1");
    const monitor = Monitor.create(
      MonitorId.generate(),
      "Billing Service",
      MonitorType.HTTP,
      ProbeConfiguration.createHttp({ url: "https://billing.example.com/health", method: "GET", timeoutMs: 2000 }),
      Schedule.create({ intervalSeconds: 30 }),
      [],
      AlarmPolicy.create({ consecutiveFailures: 3 })
    );

    dashboard.addMonitor(monitor.id);
    await dashboardRepo.save(dashboard);
    await monitorRepo.save(monitor);

    // Tracciamento Eventi Ricevuti
    const confirmedEvents: AlarmConfirmed[] = [];
    const resolvedEvents: AlarmResolved[] = [];
    eventBus.subscribe("AlarmConfirmed", (e) => { confirmedEvents.push(e); });
    eventBus.subscribe("AlarmResolved", (e) => { resolvedEvents.push(e); });

    // --- SCENARIO 1: Primo fallimento ---
    // Il check fallisce. MonitorStatus passa da UP a DOWN.
    // Viene emesso MonitorStatusChanged (UP -> DOWN).
    // OnMonitorStatusChanged alza l'allarme (OPEN).
    const check1Id = "check-1";
    
    // Simulate ExecuteCheckUseCase status change and event publishing
    monitor.updateStatus(MonitorStatus.DOWN);
    await monitorRepo.save(monitor);
    
    const statusEvent1 = new MonitorStatusChanged(monitor.id.toString(), "UP", "DOWN");
    const checkEvent1 = new CheckExecuted(check1Id, monitor.id.toString(), new Date(), "DOWN", 150, {}, []);

    await eventBus.publish(checkEvent1);
    await eventBus.publish(statusEvent1);

    // Controlliamo che l'allarme sia stato creato in stato OPEN
    let activeAlarm = await alarmRepo.findActiveByMonitorId(monitor.id);
    expect(activeAlarm).not.toBeNull();
    expect(activeAlarm?.confirmationStatus.value).toBe("OPEN");
    expect(activeAlarm?.failureAccumulator.consecutiveFailureCount).toBe(1);
    expect(confirmedEvents.length).toBe(0); // Non ancora confermato (soglia = 3)

    // --- SCENARIO 2: Secondo fallimento ---
    // Monitor è già DOWN, quindi non viene emesso MonitorStatusChanged.
    // Ma CheckExecuted (DOWN) viene emesso. OnCheckExecuted deve incrementare.
    const checkEvent2 = new CheckExecuted("check-2", monitor.id.toString(), new Date(), "DOWN", 120, {}, []);
    await eventBus.publish(checkEvent2);

    activeAlarm = await alarmRepo.findActiveByMonitorId(monitor.id);
    expect(activeAlarm?.failureAccumulator.consecutiveFailureCount).toBe(2);
    expect(confirmedEvents.length).toBe(0); // Non ancora confermato

    // --- SCENARIO 3: Terzo fallimento (Raggiungimento soglia) ---
    // CheckExecuted (DOWN) emesso. Accumulatore va a 3.
    // Dovrebbe soddisfare la politica ed essere CONFIRMED.
    const checkEvent3 = new CheckExecuted("check-3", monitor.id.toString(), new Date(), "DOWN", 130, {}, []);
    await eventBus.publish(checkEvent3);

    activeAlarm = await alarmRepo.findActiveByMonitorId(monitor.id);
    expect(activeAlarm?.confirmationStatus.value).toBe("CONFIRMED");
    expect(confirmedEvents.length).toBe(1);
    expect(confirmedEvents[0].monitorName).toBe("Billing Service");
    expect(confirmedEvents[0].dashboardIds).toEqual([dashboard.id.toString()]);

    // --- SCENARIO 4: Il monitor torna funzionante (UP) ---
    // MonitorStatus passa da DOWN a UP.
    // Viene emesso MonitorStatusChanged (DOWN -> UP).
    // OnMonitorStatusChanged deve risolvere l'allarme.
    monitor.updateStatus(MonitorStatus.UP);
    await monitorRepo.save(monitor);

    const statusEvent4 = new MonitorStatusChanged(monitor.id.toString(), "DOWN", "UP");
    const checkEvent4 = new CheckExecuted("check-4", monitor.id.toString(), new Date(), "UP", 80, {}, []);

    await eventBus.publish(checkEvent4);
    await eventBus.publish(statusEvent4);

    activeAlarm = await alarmRepo.findActiveByMonitorId(monitor.id);
    expect(activeAlarm).toBeNull(); // Nessun allarme attivo

    const history = await alarmRepo.findHistory();
    expect(history.length).toBe(1);
    expect(history[0].confirmationStatus.value).toBe("RESOLVED");
    expect(resolvedEvents.length).toBe(1);
    expect(resolvedEvents[0].monitorName).toBe("Billing Service");
    expect(resolvedEvents[0].wasNotified).toBe(false); // Non era arrivato a NOTIFIED
  });

  it("should confirm alarm immediately if consecutiveFailures is 1", async () => {
    const eventBus = new InMemoryEventBus();
    const monitorRepo = new InMemoryMonitorRepository();
    const dashboardRepo = new InMemoryDashboardRepository();
    const alarmRepo = new InMemoryAlarmRepository();

    const policyEvaluator = new AlarmPolicyEvaluator();
    const dashboardResolver = new DashboardResolverService(dashboardRepo);

    const onStatusChanged = new OnMonitorStatusChanged(alarmRepo, monitorRepo, eventBus);
    const onAlarmRaised = new OnAlarmRaised(alarmRepo, monitorRepo, policyEvaluator, dashboardResolver, eventBus);
    const onCheckExecuted = new OnCheckExecuted(alarmRepo, monitorRepo, policyEvaluator, dashboardResolver, eventBus);

    eventBus.subscribe("MonitorStatusChanged", (e) => onStatusChanged.handle(e));
    eventBus.subscribe("AlarmRaised", (e) => onAlarmRaised.handle(e));
    eventBus.subscribe("CheckExecuted", (e) => onCheckExecuted.handle(e));

    const dashboard = Dashboard.create(DashboardId.generate(), "Test Dash", "tenant-1");
    const monitor = Monitor.create(
      MonitorId.generate(),
      "Instant Alert",
      MonitorType.HTTP,
      ProbeConfiguration.createHttp({ url: "https://instant.example.com", method: "GET", timeoutMs: 1000 }),
      Schedule.create({ intervalSeconds: 30 }),
      [],
      AlarmPolicy.create({ consecutiveFailures: 1 })
    );

    dashboard.addMonitor(monitor.id);
    await dashboardRepo.save(dashboard);
    await monitorRepo.save(monitor);

    const confirmedEvents: AlarmConfirmed[] = [];
    eventBus.subscribe("AlarmConfirmed", (e) => { confirmedEvents.push(e); });

    // Primo fallimento -> cambia stato e alza allarme -> OnAlarmRaised lo conferma immediatamente
    monitor.updateStatus(MonitorStatus.DOWN);
    await monitorRepo.save(monitor);

    const statusEvent = new MonitorStatusChanged(monitor.id.toString(), "UP", "DOWN");
    const checkEvent = new CheckExecuted("check-instant", monitor.id.toString(), new Date(), "DOWN", 200, {}, []);

    await eventBus.publish(checkEvent);
    await eventBus.publish(statusEvent);

    const activeAlarm = await alarmRepo.findById(AlarmId.create(confirmedEvents[0].alarmId));
    expect(activeAlarm).not.toBeNull();
    expect(activeAlarm?.confirmationStatus.value).toBe("CONFIRMED");
    expect(confirmedEvents.length).toBe(1);
  });

  it("should resolve alarm manually via ResolveAlarmUseCase", async () => {
    const eventBus = new InMemoryEventBus();
    const monitorRepo = new InMemoryMonitorRepository();
    const alarmRepo = new InMemoryAlarmRepository();

    const monitor = Monitor.create(
      MonitorId.generate(),
      "Billing Service",
      MonitorType.HTTP,
      ProbeConfiguration.createHttp({ url: "https://billing.example.com", method: "GET", timeoutMs: 3000 }),
      Schedule.create({ intervalSeconds: 30 }),
      [],
      AlarmPolicy.create({ consecutiveFailures: 3 })
    );
    await monitorRepo.save(monitor);

    const alarm = Alarm.raise(AlarmId.generate(), monitor.id, Severity.CRITICAL, CheckExecutionId.generate());
    await alarmRepo.save(alarm);

    const useCase = new ResolveAlarmUseCase(alarmRepo, monitorRepo, eventBus);
    
    const resolvedEvents: AlarmResolved[] = [];
    eventBus.subscribe("AlarmResolved", (e) => { resolvedEvents.push(e); });

    await useCase.execute({ alarmId: alarm.id.toString() });

    const updated = await alarmRepo.findById(alarm.id);
    expect(updated?.confirmationStatus.value).toBe("RESOLVED");
    expect(resolvedEvents.length).toBe(1);
    expect(resolvedEvents[0].monitorName).toBe("Billing Service");
  });
});
