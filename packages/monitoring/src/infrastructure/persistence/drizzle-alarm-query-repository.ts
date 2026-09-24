import { eq, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { AlarmQueryRepository, AlarmDTO } from "../../domain/ports/alarm-query-repository.js";
import { alarms, monitors, dashboardMonitors } from "@monitor/db";

export class DrizzleAlarmQueryRepository implements AlarmQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findByDashboardId(dashboardId: string): Promise<AlarmDTO[]> {
    const list = await this.db
      .select({
        id: alarms.id,
        monitorId: alarms.monitorId,
        monitorName: monitors.name,
        status: alarms.status,
        severity: alarms.severity,
        failureAccumulator: alarms.failureAccumulator,
        openedAt: alarms.openedAt,
        confirmedAt: alarms.confirmedAt,
        resolvedAt: alarms.resolvedAt,
        createdAt: alarms.createdAt,
      })
      .from(alarms)
      .innerJoin(monitors, eq(alarms.monitorId, monitors.id))
      .innerJoin(dashboardMonitors, eq(monitors.id, dashboardMonitors.monitorId))
      .where(eq(dashboardMonitors.dashboardId, dashboardId))
      .orderBy(desc(alarms.openedAt));

    return list.map((a: any) => {
      const accumulatorVal = a.failureAccumulator as any;
      const alarmType = (accumulatorVal?.alarmType as string) || "AVAILABILITY";

      return {
        id: a.id,
        monitorId: a.monitorId,
        monitorName: a.monitorName,
        status: a.status,
        severity: a.severity,
        alarmType,
        openedAt: a.openedAt.toISOString(),
        confirmedAt: a.confirmedAt?.toISOString() || undefined,
        resolvedAt: a.resolvedAt?.toISOString() || undefined,
        createdAt: a.createdAt.toISOString(),
      };
    });
  }
}
