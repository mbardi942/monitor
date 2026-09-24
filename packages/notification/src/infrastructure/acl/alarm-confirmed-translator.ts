import { AlarmConfirmed } from "@monitor/monitoring";

export interface NotificationRequest {
  type: string;
  sourceId: string;
  title: string;
  dashboardIds: string[];
  payload: Record<string, any>;
}

export class AlarmConfirmedTranslator {
  public static translate(event: AlarmConfirmed): NotificationRequest {
    return {
      type: "ALARM",
      sourceId: event.alarmId,
      title: `ALLARME CONFERMATO: Il monitor ${event.monitorName} è DOWN!`,
      dashboardIds: event.dashboardIds,
      payload: {
        alarmId: event.alarmId,
        monitorId: event.monitorId,
        monitorName: event.monitorName,
        severity: event.severity,
        occurredAt: event.occurredAt,
        extractedDataSummary: event.extractedDataSummary,
      },
    };
  }
}
