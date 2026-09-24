import "server-only";
import { alarmQueryRepository } from "@/infrastructure/backend-read";
import { AlarmDTO } from "@/core/ports/gateways";

export function mapToAlarmDTO(item: any): AlarmDTO {
  return {
    id: item.id,
    monitorId: item.monitorId,
    monitorName: item.monitorName,
    status: item.status,
    severity: item.severity,
    openedAt: item.openedAt instanceof Date ? item.openedAt.toISOString() : item.openedAt,
    confirmedAt: item.confirmedAt instanceof Date ? item.confirmedAt.toISOString() : item.confirmedAt,
    resolvedAt: item.resolvedAt instanceof Date ? item.resolvedAt.toISOString() : item.resolvedAt,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

export async function getAlarmsForDashboard(dashboardId: string): Promise<AlarmDTO[]> {
  const alarms = await alarmQueryRepository.findByDashboardId(dashboardId);
  return alarms.map(mapToAlarmDTO);
}
