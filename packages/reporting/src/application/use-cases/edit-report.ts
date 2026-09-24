import { ReportRepository } from "../../domain/ports/report-repository.js";
import { ReportId } from "../../domain/model/report/report-id.js";
import { ReportContent } from "../../domain/model/report/report-content.js";
import { Report } from "../../domain/model/report/report.js";

export interface EditReportInput {
  reportId: string;
  customText: string | null;
  excludeMonitorIds?: string[];
}

export class EditReportUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  public async execute(input: EditReportInput): Promise<Report> {
    const reportId = ReportId.create(input.reportId);
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new Error(`Report with ID ${input.reportId} not found.`);
    }

    let content = report.content;

    // Se l'operatore ha selezionato monitor da escludere, filtriamo gli elementi
    if (input.excludeMonitorIds && input.excludeMonitorIds.length > 0) {
      const filteredItems = report.content.monitors.filter(
        (item) => !input.excludeMonitorIds!.includes(item.monitorId)
      );
      content = ReportContent.create(filteredItems);
    }

    // Eseguiamo la modifica all'interno dell'aggregato (che controlla lo stato DRAFT)
    report.editContent(content, input.customText);

    // Salviamo lo stato aggiornato
    await this.reportRepository.save(report);

    return report;
  }
}
