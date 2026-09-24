import "server-only";
import { monitorQueryRepository } from "@/infrastructure/backend-read";
import { MonitorDTO } from "@/core/ports/gateways";
import { flattenProbeConfiguration } from "@/core/mappers/probe-configuration-mapper";

export function mapToMonitorDTO(item: any): MonitorDTO {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    status: item.status,
    probeConfiguration: flattenProbeConfiguration(item.probeConfiguration),
    schedule: item.schedule,
    assertionRules: item.assertionRules || [],
    metricRules: item.metricRules || [],
    alarmPolicy: item.alarmPolicy,
    dataExtractor: item.dataExtractor,
    dataHealthStatus: item.dataHealthStatus,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    lastCheckTime: item.lastCheckTime instanceof Date ? item.lastCheckTime.toISOString() : item.lastCheckTime,
    lastResponseTimeMs: item.lastResponseTimeMs,
    lastStatus: item.lastStatus,
    recentExecutions: (item.recentExecutions || []).map((ex: any) => ({
      timestamp: ex.timestamp instanceof Date ? ex.timestamp.toISOString() : ex.timestamp,
      status: ex.status,
      responseTimeMs: ex.responseTimeMs,
      extractedData: ex.extractedData,
      assertionResults: ex.assertionResults,
    })),
  };
}

export async function getMonitorsForDashboard(dashboardId: string): Promise<MonitorDTO[]> {
  const monitors = await monitorQueryRepository.findByDashboardId(dashboardId);
  return monitors.map(mapToMonitorDTO);
}

export async function getMonitorById(monitorId: string): Promise<MonitorDTO | null> {
  const monitor = await monitorQueryRepository.findWithChecksById(monitorId);
  if (!monitor) return null;
  return mapToMonitorDTO(monitor);
}

export function computeDashboardMetrics(monitors: MonitorDTO[]) {
  const totalMonitors = monitors.length;
  const activeMonitors = monitors.filter((m) => m.status !== "PAUSED").length;
  const monitorsDown = monitors.filter((m) => m.status === "DOWN").length;

  let upChecksCount = 0;
  let totalChecksCount = 0;
  for (const m of monitors) {
    const execs = m.recentExecutions || [];
    upChecksCount += execs.filter((e: any) => e.status === "UP").length;
    totalChecksCount += execs.length;
  }
  const globalUptime =
    totalChecksCount === 0 ? 100 : Math.round((upChecksCount / totalChecksCount) * 1000) / 10;

  return {
    totalMonitors,
    activeMonitors,
    monitorsDown,
    globalUptime,
  };
}

export async function getDashboardMetrics(dashboardId: string) {
  const monitors = await getMonitorsForDashboard(dashboardId);
  return computeDashboardMetrics(monitors);
}

