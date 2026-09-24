import { ReportTemplate } from "../model/report-template/report-template.js";
import { ReportTemplateId } from "../model/report-template/report-template.js";

export interface ReportTemplateRepository {
  findById(id: ReportTemplateId): Promise<ReportTemplate | null>;
  save(template: ReportTemplate): Promise<void>;
}
