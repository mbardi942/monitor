import { DomainEventBus } from "@monitor/shared-kernel";
import { CheckExecuted } from "../../domain/events/check-executed.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { CheckExecutionId } from "../../domain/model/check-execution/check-execution-id.js";
import { AlarmRepository } from "../../domain/ports/alarm-repository.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import { AlarmPolicyEvaluator } from "../../domain/services/alarm-policy-evaluator.js";
import { DashboardResolverService } from "../../domain/services/dashboard-resolver-service.js";
import { AlarmType } from "../../domain/model/alarm/alarm.js";

export class OnCheckExecuted {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly monitorRepository: MonitorRepository,
    private readonly alarmPolicyEvaluator: AlarmPolicyEvaluator,
    private readonly dashboardResolverService: DashboardResolverService,
    private readonly eventBus: DomainEventBus
  ) {}

  public async handle(event: CheckExecuted): Promise<void> {
    const monitorId = MonitorId.create(event.monitorId);

    // 1. Gestione allarme disponibilità (AVAILABILITY)
    if (event.status === "DOWN") {
      await this.accumulateAndEvaluate(monitorId, "AVAILABILITY", event);
    }

    // 2. Gestione allarme metriche/dati (DATA_METRIC)
    if (event.dataStatus === "CRITICAL" || event.dataStatus === "WARNING") {
      await this.accumulateAndEvaluate(monitorId, "DATA_METRIC", event);
    }
  }

  private async accumulateAndEvaluate(
    monitorId: MonitorId,
    alarmType: AlarmType,
    event: CheckExecuted
  ): Promise<void> {
    const activeAlarm = await this.alarmRepository.findActiveByMonitorId(monitorId, alarmType);

    // Accumuliamo i fallimenti solo se l'allarme attivo è nello stato iniziale OPEN
    if (activeAlarm && activeAlarm.confirmationStatus.value === "OPEN") {
      const checkExecutionId = CheckExecutionId.create(event.checkExecutionId);

      // 1. Accumula il fallimento
      activeAlarm.accumulateFailure(checkExecutionId);
      await this.alarmRepository.save(activeAlarm);

      // 2. Valuta se confermare l'allarme
      const monitor = await this.monitorRepository.findById(monitorId);
      if (!monitor) {
        return;
      }

      const shouldConfirm = this.alarmPolicyEvaluator.shouldConfirm(activeAlarm, monitor.alarmPolicy);
      if (shouldConfirm) {
        const dashboardIds = await this.dashboardResolverService.findDashboardsByMonitorId(monitorId);
        const dashboardIdsStr = dashboardIds.map((id) => id.toString());

        // Costruisci il sommario a seconda della tipologia
        let failedDetails: any[] = [];
        if (alarmType === "AVAILABILITY") {
          failedDetails = (event.assertionResults || [])
            .filter((res) => !res.passed)
            .map((res) => ({
              target: res.rule.target,
              operator: res.rule.operator,
              expected: res.rule.value,
              actual: res.actualValue,
              property: res.rule.property,
            }));
        } else {
          failedDetails = (event.metricResults || [])
            .filter((res) => !res.passed)
            .map((res) => ({
              property: res.rule.property,
              operator: res.rule.operator,
              expected: res.rule.value,
              actual: res.actualValue,
              aggregation: res.rule.aggregation,
            }));
        }

        const extractedDataSummary = {
          alarmType,
          probeHealth: event.probeHealth,
          dataAlertLevel: event.dataAlertLevel,
          dataStatus: event.dataStatus,
          extractedData: event.extractedData,
          failedDetails,
        };

        // 3. Conferma l'allarme
        activeAlarm.confirm(monitor.name, dashboardIdsStr, extractedDataSummary);
        await this.alarmRepository.save(activeAlarm);

        // 4. Pubblica l'evento AlarmConfirmed
        const events = activeAlarm.pullDomainEvents();
        for (const ev of events) {
          await this.eventBus.publish(ev);
        }
      }
    }
  }
}
