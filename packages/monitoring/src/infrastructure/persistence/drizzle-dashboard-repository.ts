import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { DashboardRepository } from "../../domain/ports/dashboard-repository.js";
import { Dashboard } from "../../domain/model/dashboard/dashboard.js";
import { DashboardId } from "../../domain/model/dashboard/dashboard-id.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { DashboardReportConfig } from "../../domain/model/dashboard/dashboard-report-config.js";
import { dashboards, dashboardMonitors } from "@monitor/db";

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findById(id: DashboardId): Promise<Dashboard | null> {
    const dashRows = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id.toString()));

    if (dashRows.length === 0) {
      return null;
    }

    const dashRow = dashRows[0];

    const linkRows = await this.db
      .select()
      .from(dashboardMonitors)
      .where(eq(dashboardMonitors.dashboardId, id.toString()));

    const monitorIds = linkRows.map((row) => MonitorId.create(row.monitorId));
    const reportConfigVal = dashRow.reportConfig as any;

    return Dashboard.reconstitute(
      DashboardId.create(dashRow.id),
      dashRow.name,
      dashRow.tenantId,
      monitorIds,
      reportConfigVal
        ? DashboardReportConfig.create(reportConfigVal)
        : DashboardReportConfig.createDisabled(),
      dashRow.createdAt,
      dashRow.updatedAt
    );
  }

  public async save(dashboard: Dashboard): Promise<void> {
    await this.db.transaction(async (tx) => {
      const values = {
        id: dashboard.id.toString(),
        name: dashboard.name,
        tenantId: dashboard.tenantId,
        reportConfig: dashboard.reportConfig.toValue(),
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      };

      // 1. Salva dashboard
      await tx
        .insert(dashboards)
        .values(values)
        .onConflictDoUpdate({
          target: dashboards.id,
          set: {
            name: values.name,
            reportConfig: values.reportConfig,
            updatedAt: values.updatedAt,
          },
        });

      // 2. Rimuovi i vecchi collegamenti
      await tx
        .delete(dashboardMonitors)
        .where(eq(dashboardMonitors.dashboardId, dashboard.id.toString()));

      // 3. Inserisci i nuovi collegamenti
      if (dashboard.monitorIds.length > 0) {
        await tx.insert(dashboardMonitors).values(
          dashboard.monitorIds.map((monitorId) => ({
            dashboardId: dashboard.id.toString(),
            monitorId: monitorId.toString(),
          }))
        );
      }
    });
  }

  public async findByMonitorId(monitorId: MonitorId): Promise<Dashboard[]> {
    const linkRows = await this.db
      .select()
      .from(dashboardMonitors)
      .where(eq(dashboardMonitors.monitorId, monitorId.toString()));

    const list: Dashboard[] = [];
    for (const link of linkRows) {
      const d = await this.findById(DashboardId.create(link.dashboardId));
      if (d) {
        list.push(d);
      }
    }
    return list;
  }
}
