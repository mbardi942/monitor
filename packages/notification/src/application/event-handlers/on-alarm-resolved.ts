import { AlarmResolved, DashboardResolverService, MonitorId } from "@monitor/monitoring";
import { DeliverNotificationUseCase } from "../use-cases/deliver-notification.js";
import { AlarmResolvedTranslator } from "../../infrastructure/acl/alarm-resolved-translator.js";

export class OnAlarmResolved {
  constructor(
    private readonly dashboardResolverService: DashboardResolverService,
    private readonly deliverNotificationUseCase: DeliverNotificationUseCase
  ) {}

  public async handle(event: AlarmResolved): Promise<void> {
    // Se la notifica di recovery non è abilitata per questo monitor, evitiamo l'invio
    if (!event.recoveryEnabled) {
      console.log(`[OnAlarmResolved] Recovery notification disabled for monitor ${event.monitorName} (${event.monitorId}). Skipping.`);
      return;
    }

    // Risolviamo le dashboard associate a questo monitor
    const monitorId = MonitorId.create(event.monitorId);
    const dashboardIds = await this.dashboardResolverService.findDashboardsByMonitorId(monitorId);
    const dashboardIdsStr = dashboardIds.map((id) => id.toString());

    if (dashboardIdsStr.length === 0) {
      console.warn(`[OnAlarmResolved] No dashboards found for resolved monitor ${event.monitorName} (${event.monitorId}).`);
      return;
    }

    const request = AlarmResolvedTranslator.translate(event, dashboardIdsStr);
    await this.deliverNotificationUseCase.execute(request);
  }
}
