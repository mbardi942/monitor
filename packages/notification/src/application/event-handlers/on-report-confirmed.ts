import { DeliverNotificationUseCase } from "../use-cases/deliver-notification.js";
import { ReportConfirmedTranslator, ReportConfirmedEvent } from "../../infrastructure/acl/report-confirmed-translator.js";

export class OnReportConfirmed {
  constructor(private readonly deliverNotificationUseCase: DeliverNotificationUseCase) {}

  public async handle(event: ReportConfirmedEvent): Promise<void> {
    // Traduzione dell'evento tramite l'Anticorruption Layer (ACL)
    const request = ReportConfirmedTranslator.translate(event);

    // Consegna della notifica a tutti i canali
    await this.deliverNotificationUseCase.execute(request);
  }
}
