import { ReportRepository } from "../../domain/ports/report-repository.js";
import { ReportId } from "../../domain/model/report/report-id.js";

export interface NotificationDeliveredEvent {
  notificationId: string;
  type: string;
  sourceId: string;
  dashboardIds: string[];
  deliveredChannels: string[];
}

export class OnNotificationDelivered {
  constructor(private readonly reportRepository: ReportRepository) {}

  public async handle(event: NotificationDeliveredEvent): Promise<void> {
    // Gestiamo solo le notifiche relative all'invio dei report
    if (event.type !== "REPORT") {
      return;
    }

    const reportId = ReportId.create(event.sourceId);
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      console.warn(`[OnNotificationDelivered] Report with ID ${event.sourceId} not found.`);
      return;
    }

    // Cambia lo stato in SENT
    report.markSent();

    // Salva lo stato a database
    await this.reportRepository.save(report);

    console.log(`[OnNotificationDelivered] Report ${event.sourceId} successfully marked as SENT.`);
  }
}
