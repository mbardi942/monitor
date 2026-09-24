import { PgDatabase } from "drizzle-orm/pg-core";
import { DashboardQueryRepository, DashboardDTO } from "../../domain/ports/dashboard-query-repository.js";
import { dashboards } from "@monitor/db";

export class DrizzleDashboardQueryRepository implements DashboardQueryRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findAll(): Promise<DashboardDTO[]> {
    const list = await this.db.select().from(dashboards);

    return list.map((d: any) => ({
      id: d.id,
      name: d.name,
      reportConfig: d.reportConfig,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    }));
  }
}
