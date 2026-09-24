import { Report } from "../../domain/model/report/report.js";
import { ReportId } from "../../domain/model/report/report-id.js";
import { ReportPeriod } from "../../domain/model/report/report-period.js";
import { ReportRepository } from "../../domain/ports/report-repository.js";
import { CheckDataReader } from "../../domain/ports/check-data-reader.js";
import { ReportAggregationService } from "../../domain/services/report-aggregation-service.js";

export interface GenerateReportInput {
  dashboardId: string;
  from: Date;
  to: Date;
  customText?: string | null;
}

export class GenerateReportUseCase {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly checkDataReader: CheckDataReader,
    private readonly reportAggregationService: ReportAggregationService
  ) {}

  public async execute(input: GenerateReportInput): Promise<Report> {
    const period = ReportPeriod.create(input.from, input.to);

    // Carica metriche e dati dei check specifici dal database di monitoring
    const metrics = await this.checkDataReader.getMetricsForDashboard(
      input.dashboardId,
      input.from,
      input.to
    );

    // Aggrega i dati calcolando uptime %, response time medio e aggregando gli ultimi extractedData
    const content = this.reportAggregationService.aggregate(metrics);

    // Genera l'id del report e istanzia l'aggregato in stato DRAFT
    const reportId = ReportId.generate();
    const report = Report.create(
      reportId,
      input.dashboardId,
      period,
      content,
      input.customText || null
    );

    // Salva a database
    await this.reportRepository.save(report);

    return report;
  }
}
