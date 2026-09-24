import { eq, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { ReportQueryRepository, ReportDTO } from "../../domain/ports/report-query-repository.js";
import { reports } from "@monitor/db";

export class DrizzleReportQueryRepository implements ReportQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findByDashboardId(dashboardId: string): Promise<ReportDTO[]> {
    const list = await this.db
      .select()
      .from(reports)
      .where(eq(reports.dashboardId, dashboardId))
      .orderBy(desc(reports.createdAt));

    return list.map((r: any) => ({
      id: r.id,
      dashboardId: r.dashboardId,
      status: r.status,
      periodFrom: r.periodFrom.toISOString(),
      periodTo: r.periodTo.toISOString(),
      content: r.content,
      customText: r.customText || undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
