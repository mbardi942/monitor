import { ReportRepository } from "../../domain/ports/report-repository.js";
import { ReportId } from "../../domain/model/report/report-id.js";
import { DomainEventBus } from "@monitor/shared-kernel";
import { Report } from "../../domain/model/report/report.js";

export interface ConfirmReportInput {
  reportId: string;
}

export class ConfirmReportUseCase {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: ConfirmReportInput): Promise<Report> {
    const reportId = ReportId.create(input.reportId);
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new Error(`Report with ID ${input.reportId} not found.`);
    }

    // Passa lo stato a CONFIRMED e genera il Domain Event ReportConfirmed
    report.confirm();

    // Salva a database
    await this.reportRepository.save(report);

    // Estrae e pubblica gli eventi
    const events = report.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return report;
  }
}
