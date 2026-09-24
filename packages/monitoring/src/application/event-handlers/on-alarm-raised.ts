import { DomainEventBus } from "@monitor/shared-kernel";
import { AlarmRaised } from "../../domain/events/alarm-raised.js";
import { AlarmId } from "../../domain/model/alarm/alarm-id.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { AlarmRepository } from "../../domain/ports/alarm-repository.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import { AlarmPolicyEvaluator } from "../../domain/services/alarm-policy-evaluator.js";
import { DashboardResolverService } from "../../domain/services/dashboard-resolver-service.js";

export class OnAlarmRaised {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly monitorRepository: MonitorRepository,
    private readonly alarmPolicyEvaluator: AlarmPolicyEvaluator,
    private readonly dashboardResolverService: DashboardResolverService,
    private readonly eventBus: DomainEventBus
  ) {}

  public async handle(event: AlarmRaised): Promise<void> {
    const alarmId = AlarmId.create(event.alarmId);
    const alarm = await this.alarmRepository.findById(alarmId);
    if (!alarm) {
      return;
    }

    const monitorId = MonitorId.create(event.monitorId);
    const monitor = await this.monitorRepository.findById(monitorId);
    if (!monitor) {
      return;
    }

    // 1. Valuta la politica degli allarmi
    const shouldConfirm = this.alarmPolicyEvaluator.shouldConfirm(alarm, monitor.alarmPolicy);
    if (!shouldConfirm) {
      return; // Criteri non ancora soddisfatti
    }

    // 2. Risolvi le dashboard associate al monitor per propagare le notifiche
    const dashboardIds = await this.dashboardResolverService.findDashboardsByMonitorId(monitorId);
    const dashboardIdsStr = dashboardIds.map((id) => id.toString());

    // 3. Conferma l'allarme
    alarm.confirm(monitor.name, dashboardIdsStr);
    await this.alarmRepository.save(alarm);

    // 4. Pubblica l'evento AlarmConfirmed
    const events = alarm.pullDomainEvents();
    for (const ev of events) {
      await this.eventBus.publish(ev);
    }
  }
}
