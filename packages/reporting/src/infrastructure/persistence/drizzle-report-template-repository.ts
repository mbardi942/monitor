import { eq } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { ReportTemplateRepository } from "../../domain/ports/report-template-repository.js";
import { ReportTemplate, ReportTemplateId } from "../../domain/model/report-template/report-template.js";
import { TemplateLayout } from "../../domain/model/report-template/template-layout.js";
import { reportTemplates } from "@monitor/db";

export class DrizzleReportTemplateRepository implements ReportTemplateRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findById(id: ReportTemplateId): Promise<ReportTemplate | null> {
    const rows = await this.db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, id.toString()));

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const layoutVal = row.layout as any;

    return ReportTemplate.reconstitute(
      ReportTemplateId.create(row.id),
      {
        name: row.name,
        layout: TemplateLayout.create(layoutVal),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    );
  }

  public async save(template: ReportTemplate): Promise<void> {
    const values = {
      id: template.id.toString(),
      name: template.name,
      layout: template.layout.toValue(),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    await this.db
      .insert(reportTemplates)
      .values(values)
      .onConflictDoUpdate({
        target: reportTemplates.id,
        set: {
          name: values.name,
          layout: values.layout,
          updatedAt: values.updatedAt,
        },
      });
  }
}
