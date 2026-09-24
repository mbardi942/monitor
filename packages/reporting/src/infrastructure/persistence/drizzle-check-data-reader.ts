import { and, eq, gte, lte, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { CheckDataReader, MonitorMetrics } from "../../domain/ports/check-data-reader.js";
import { dashboardMonitors, monitors, checkExecutions } from "@monitor/db";

export class DrizzleCheckDataReader implements CheckDataReader {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async getMetricsForDashboard(
    dashboardId: string,
    from: Date,
    to: Date
  ): Promise<MonitorMetrics[]> {
    // 1. Recupera i monitor associati alla dashboard
    const dashboardMonIds = await this.db
      .select({
        id: monitors.id,
        name: monitors.name,
      })
      .from(dashboardMonitors)
      .innerJoin(monitors, eq(dashboardMonitors.monitorId, monitors.id))
      .where(eq(dashboardMonitors.dashboardId, dashboardId));

    if (dashboardMonIds.length === 0) {
      return [];
    }

    const result: MonitorMetrics[] = [];

    // 2. Per ciascun monitor, recupera le metriche aggregate e gli ultimi check nel periodo
    for (const monitor of dashboardMonIds) {
      // Recupera tutti i check del monitor nel periodo per calcolare le metriche aggregate in modo accurato
      const checks = await this.db
        .select()
        .from(checkExecutions)
        .where(
          and(
            eq(checkExecutions.monitorId, monitor.id),
            gte(checkExecutions.timestamp, from),
            lte(checkExecutions.timestamp, to)
          )
        );

      const totalChecks = checks.length;
      let uptimePercentage = 100;
      let avgResponseTimeMs = 0;
      let failedChecks = 0;

      if (totalChecks > 0) {
        const successfulChecks = checks.filter((c) => c.status === "UP").length;
        failedChecks = totalChecks - successfulChecks;
        uptimePercentage = (successfulChecks / totalChecks) * 100;

        const sumResponseTime = checks.reduce((sum, c) => sum + c.responseTimeMs, 0);
        avgResponseTimeMs = sumResponseTime / totalChecks;
      }

      // Recupera gli ultimi 10 check del monitor (sempre nel periodo) per estrarre i dati custom
      const recentChecks = await this.db
        .select({
          timestamp: checkExecutions.timestamp,
          status: checkExecutions.status,
          extractedData: checkExecutions.extractedData,
        })
        .from(checkExecutions)
        .where(
          and(
            eq(checkExecutions.monitorId, monitor.id),
            gte(checkExecutions.timestamp, from),
            lte(checkExecutions.timestamp, to)
          )
        )
        .orderBy(desc(checkExecutions.timestamp))
        .limit(10);

      result.push({
        monitorId: monitor.id,
        monitorName: monitor.name,
        uptimePercentage,
        avgResponseTimeMs,
        totalChecks,
        failedChecks,
        recentExecutions: recentChecks.map((rc) => ({
          timestamp: rc.timestamp,
          status: rc.status as any,
          extractedData: rc.extractedData as Record<string, any> | null,
        })),
      });
    }

    return result;
  }
}
