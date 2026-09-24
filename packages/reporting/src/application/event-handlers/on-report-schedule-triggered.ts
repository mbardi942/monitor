import { ReportScheduleTriggered } from "@monitor/scheduling";
import { GenerateReportUseCase } from "../use-cases/generate-report.js";

export class OnReportScheduleTriggered {
  constructor(private readonly generateReportUseCase: GenerateReportUseCase) {}

  public async handle(event: ReportScheduleTriggered): Promise<void> {
    const { dashboardId, scheduledAt } = event;

    // Calcoliamo il periodo di default come le ultime 24 ore prima dello scatto del trigger
    const to = new Date(scheduledAt);
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // 24 ore fa

    await this.generateReportUseCase.execute({
      dashboardId,
      from,
      to,
      customText: "Generato automaticamente dallo scheduler periodico.",
    });
  }
}
