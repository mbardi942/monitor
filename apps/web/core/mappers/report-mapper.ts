import type { Report } from "@monitor/reporting";
import type { ReportDTO } from "@/core/ports/gateways";

/**
 * Mappa l'aggregato di dominio `Report` verso il DTO esposto al client.
 * Centralizza la traduzione Value Object -> primitivi (toValue/value/ISO),
 * evitando duplicazione tra le Server Actions.
 */
export function toReportDTO(report: Report): ReportDTO {
  const contentProps = report.content?.toValue();
  const rawMonitors = contentProps?.monitors || [];
  
  const totalMonitors = rawMonitors.length;
  let totalUptime = 0;
  let totalAvgResTime = 0;

  const monitors = rawMonitors.map(m => {
    totalUptime += m.uptimePercentage;
    totalAvgResTime += m.avgResponseTimeMs;
    
    return {
      id: m.monitorId,
      name: m.monitorName,
      uptimePercent: m.uptimePercentage,
      avgResponseTimeMs: m.avgResponseTimeMs,
      p95ResponseTimeMs: undefined,
      p99ResponseTimeMs: undefined,
      timeSeries: undefined
    };
  });

  const uptimePercent = totalMonitors > 0 ? Math.round((totalUptime / totalMonitors) * 10) / 10 : 100;
  const avgResponseTimeMs = totalMonitors > 0 ? Math.round(totalAvgResTime / totalMonitors) : 0;

  return {
    id: report.id.toValue(),
    dashboardId: report.dashboardId,
    status: report.status.value,
    periodFrom: report.period.from.toISOString(),
    periodTo: report.period.to.toISOString(),
    content: {
      uptimePercent,
      avgResponseTimeMs,
      totalMonitors,
      monitors
    },
    customText: report.customText ?? undefined,
    createdAt: report.createdAt.toISOString(),
  };
}
