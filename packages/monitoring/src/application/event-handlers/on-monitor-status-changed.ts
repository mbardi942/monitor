import { DomainEventBus } from "@monitor/shared-kernel";
import { MonitorStatusChanged } from "../../domain/events/monitor-status-changed.js";
import { Alarm } from "../../domain/model/alarm/alarm.js";
import { AlarmId } from "../../domain/model/alarm/alarm-id.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { CheckExecutionId } from "../../domain/model/check-execution/check-execution-id.js";
import { Severity } from "../../domain/model/alarm/severity.js";
import { AlarmRepository } from "../../domain/ports/alarm-repository.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";

export class OnMonitorStatusChanged {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly monitorRepository: MonitorRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async handle(event: MonitorStatusChanged): Promise<void> {
    const monitorId = MonitorId.create(event.monitorId);

    if (event.newStatus === "DOWN" || event.newStatus === "DEGRADED") {
      // 1. Verifica se esiste già un allarme attivo di tipo AVAILABILITY
      const activeAlarm = await this.alarmRepository.findActiveByMonitorId(monitorId, "AVAILABILITY");
      if (activeAlarm) {
        return; // Allarme già attivo per questo monitor
      }

      // 2. Recupera il monitor per ottenere le configurazioni
      const monitor = await this.monitorRepository.findById(monitorId);
      if (!monitor) {
        return;
      }

      // Determina la severità di default (CRITICAL per DOWN, WARNING per DEGRADED)
      const severity = event.newStatus === "DOWN" ? Severity.CRITICAL : Severity.WARNING;

      // 3. Alza l'allarme in stato OPEN di tipo AVAILABILITY
      const triggerCheckId = CheckExecutionId.generate();
      const alarm = Alarm.raise(
        AlarmId.generate(),
        monitorId,
        severity,
        triggerCheckId,
        "AVAILABILITY"
      );

      await this.alarmRepository.save(alarm);

      // 4. Pubblica l'evento AlarmRaised
      const events = alarm.pullDomainEvents();
      for (const ev of events) {
        await this.eventBus.publish(ev);
      }
    } else if (event.newStatus === "UP") {
      // 1. Trova l'allarme attivo di tipo AVAILABILITY per il monitor
      const activeAlarm = await this.alarmRepository.findActiveByMonitorId(monitorId, "AVAILABILITY");
      if (!activeAlarm) {
        return; // Nessun allarme attivo da risolvere
      }

      const monitor = await this.monitorRepository.findById(monitorId);
      const monitorName = monitor ? monitor.name : "Unknown Monitor";
      const recoveryEnabled = monitor ? monitor.alarmPolicy.recoveryNotificationEnabled : true;

      // 2. Risolvi l'allarme
      activeAlarm.resolve(monitorName, recoveryEnabled);
      await this.alarmRepository.save(activeAlarm);

      // 3. Pubblica l'evento AlarmResolved
      const events = activeAlarm.pullDomainEvents();
      for (const ev of events) {
        await this.eventBus.publish(ev);
      }
    }
  }
}
