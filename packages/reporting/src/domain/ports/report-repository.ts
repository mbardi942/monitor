import { Report } from "../model/report/report.js";
import { ReportId } from "../model/report/report-id.js";

export interface ReportRepository {
  findById(id: ReportId): Promise<Report | null>;
  findByDashboardId(dashboardId: string): Promise<Report[]>;
  save(report: Report): Promise<void>;
}
