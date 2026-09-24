import { NotificationRequest } from "./alarm-confirmed-translator.js";

export interface ReportConfirmedEvent {
  reportId: string;
  dashboardId: string;
  reportContent: Record<string, any>;
  customText: string | null;
  periodFrom: Date;
  periodTo: Date;
}

export class ReportConfirmedTranslator {
  public static translate(event: ReportConfirmedEvent): NotificationRequest {
    return {
      type: "REPORT",
      sourceId: event.reportId,
      title: `REPORT API MONITOR: Riepilogo periodico delle prestazioni`,
      dashboardIds: [event.dashboardId],
      payload: {
        reportId: event.reportId,
        dashboardId: event.dashboardId,
        reportContent: event.reportContent,
        customText: event.customText,
        periodFrom: event.periodFrom,
        periodTo: event.periodTo,
      },
    };
  }
}
export { NotificationRequest };
