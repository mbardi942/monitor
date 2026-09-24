import { eq, desc, asc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { MonitorQueryRepository, MonitorWithChecksDTO } from "../../domain/ports/monitor-query-repository.js";
import { monitors, dashboardMonitors, checkExecutions } from "@monitor/db";

export class DrizzleMonitorQueryRepository implements MonitorQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findByDashboardId(dashboardId: string): Promise<MonitorWithChecksDTO[]> {
    const results = await this.db
      .select({ monitor: monitors })
      .from(dashboardMonitors)
      .innerJoin(monitors, eq(dashboardMonitors.monitorId, monitors.id))
      .where(eq(dashboardMonitors.dashboardId, dashboardId))
      .orderBy(asc(monitors.createdAt), asc(monitors.name));

    if (results.length === 0) {
      return [];
    }

    const monitorDTOs: MonitorWithChecksDTO[] = await Promise.all(
      results.map(async (r) => {
        const mon = r.monitor;

        const recentChecks = await this.db
          .select({
            timestamp: checkExecutions.timestamp,
            status: checkExecutions.status,
            responseTimeMs: checkExecutions.responseTimeMs,
            extractedData: checkExecutions.extractedData,
          })
          .from(checkExecutions)
          .where(eq(checkExecutions.monitorId, mon.id))
          .orderBy(desc(checkExecutions.timestamp))
          .limit(30);

        // Includiamo extractedData solo per l'ultimo check, alleggerendo lo storico
        const formattedExecutions = recentChecks.map((ce: any, idx: number) => ({
          timestamp: ce.timestamp.toISOString(),
          status: ce.status,
          responseTimeMs: ce.responseTimeMs,
          extractedData: idx === 0 ? ce.extractedData : undefined,
        }));

        const lastCheck = recentChecks[0];
        const extractorVal = mon.dataExtractor as any;
        const hasExtractor = extractorVal && (extractorVal.schema || extractorVal.displayHint);
        const cleanDataExtractor = hasExtractor
          ? {
              schema: extractorVal.schema,
              displayHint: extractorVal.displayHint,
              maxRows: extractorVal.maxRows,
              pageSize: extractorVal.pageSize,
              retainHistory: extractorVal.retainHistory,
            }
          : undefined;
        const dataHealthStatus = extractorVal?.dataHealthStatus || "NONE";
        const metricRules = extractorVal?.metricRules || [];

        return {
          id: mon.id,
          name: mon.name,
          type: mon.type,
          status: mon.status,
          probeConfiguration: mon.probeConfiguration,
          schedule: mon.schedule,
          assertionRules: (mon.assertionRules as any[]) || [],
          alarmPolicy: mon.alarmPolicy,
          dataExtractor: cleanDataExtractor,
          dataHealthStatus,
          metricRules,
          createdAt: mon.createdAt.toISOString(),
          updatedAt: mon.updatedAt.toISOString(),
          lastCheckTime: lastCheck ? lastCheck.timestamp.toISOString() : undefined,
          lastResponseTimeMs: lastCheck ? lastCheck.responseTimeMs : undefined,
          lastStatus: lastCheck ? lastCheck.status : undefined,
          recentExecutions: formattedExecutions,
        };
      })
    );

    return monitorDTOs;
  }


  public async findWithChecksById(monitorId: string): Promise<MonitorWithChecksDTO | null> {
    const results = await this.db
      .select()
      .from(monitors)
      .where(eq(monitors.id, monitorId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const mon = results[0];

    const recentChecks = await this.db
      .select()
      .from(checkExecutions)
      .where(eq(checkExecutions.monitorId, mon.id))
      .orderBy(desc(checkExecutions.timestamp))
      .limit(50); // limit(50) come nel GET /monitors/:id originale

    const formattedExecutions = recentChecks.map((ce: any) => ({
      timestamp: ce.timestamp.toISOString(),
      status: ce.status,
      responseTimeMs: ce.responseTimeMs,
      assertionResults: ce.assertionResults,
      extractedData: ce.extractedData,
    }));

    const lastCheck = recentChecks[0];
    const extractorVal = mon.dataExtractor as any;
    const hasExtractor = extractorVal && (extractorVal.schema || extractorVal.displayHint);
    const cleanDataExtractor = hasExtractor ? {
      schema: extractorVal.schema,
      displayHint: extractorVal.displayHint,
      maxRows: extractorVal.maxRows,
      pageSize: extractorVal.pageSize,
      retainHistory: extractorVal.retainHistory,
    } : undefined;
    const dataHealthStatus = extractorVal?.dataHealthStatus || "NONE";
    const metricRules = extractorVal?.metricRules || [];

    return {
      id: mon.id,
      name: mon.name,
      type: mon.type,
      status: mon.status,
      probeConfiguration: mon.probeConfiguration,
      schedule: mon.schedule,
      assertionRules: (mon.assertionRules as any[]) || [],
      alarmPolicy: mon.alarmPolicy,
      dataExtractor: cleanDataExtractor,
      dataHealthStatus,
      metricRules,
      createdAt: mon.createdAt.toISOString(),
      updatedAt: mon.updatedAt.toISOString(),
      lastCheckTime: lastCheck ? lastCheck.timestamp.toISOString() : undefined,
      lastResponseTimeMs: lastCheck ? lastCheck.responseTimeMs : undefined,
      lastStatus: lastCheck ? lastCheck.status : undefined,
      recentExecutions: formattedExecutions,
    };
  }
}
