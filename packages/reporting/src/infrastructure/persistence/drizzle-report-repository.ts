import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { ReportRepository } from "../../domain/ports/report-repository.js";
import { Report } from "../../domain/model/report/report.js";
import { ReportId } from "../../domain/model/report/report-id.js";
import { ReportStatus } from "../../domain/model/report/report-status.js";
import { ReportPeriod } from "../../domain/model/report/report-period.js";
import { ReportContent } from "../../domain/model/report/report-content.js";
import { reports } from "@monitor/db";

export class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findById(id: ReportId): Promise<Report | null> {
    const rows = await this.db
      .select()
      .from(reports)
      .where(eq(reports.id, id.toString()));

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const contentVal = row.content as any;

    return Report.reconstitute(
      ReportId.create(row.id),
      {
        dashboardId: row.dashboardId,
        status: ReportStatus.create(row.status as any),
        period: ReportPeriod.create(row.periodFrom, row.periodTo),
        content: ReportContent.create(contentVal.monitors || []),
        customText: row.customText,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    );
  }

  public async findByDashboardId(dashboardId: string): Promise<Report[]> {
    const rows = await this.db
      .select()
      .from(reports)
      .where(eq(reports.dashboardId, dashboardId));

    return rows.map((row) => {
      const contentVal = row.content as any;
      return Report.reconstitute(
        ReportId.create(row.id),
        {
          dashboardId: row.dashboardId,
          status: ReportStatus.create(row.status as any),
          period: ReportPeriod.create(row.periodFrom, row.periodTo),
          content: ReportContent.create(contentVal.monitors || []),
          customText: row.customText,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      );
    });
  }

  public async save(report: Report): Promise<void> {
    const values = {
      id: report.id.toString(),
      dashboardId: report.dashboardId,
      status: report.status.value,
      periodFrom: report.period.from,
      periodTo: report.period.to,
      content: report.content.toValue(),
      customText: report.customText,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };

    await this.db
      .insert(reports)
      .values(values)
      .onConflictDoUpdate({
        target: reports.id,
        set: {
          status: values.status,
          content: values.content,
          customText: values.customText,
          updatedAt: values.updatedAt,
        },
      });
  }
}
