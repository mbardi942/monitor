import { AlarmResolved } from "@monitor/monitoring";
import { NotificationRequest } from "./alarm-confirmed-translator.js";

export class AlarmResolvedTranslator {
  public static translate(event: AlarmResolved, dashboardIds: string[]): NotificationRequest {
    // Calcoliamo la durata in minuti/secondi per renderla leggibile
    const durationSeconds = Math.round(event.durationMs / 1000);
    const durationText = durationSeconds >= 60 
      ? `${Math.round(durationSeconds / 60)} min`
      : `${durationSeconds} sec`;

    return {
      type: "RECOVERY",
      sourceId: event.alarmId,
      title: `ALLARME RISOLTO: Il monitor ${event.monitorName} è tornato UP`,
      dashboardIds,
      payload: {
        alarmId: event.alarmId,
        monitorId: event.monitorId,
        monitorName: event.monitorName,
        durationText,
        occurredAt: event.occurredOn,
        recoveryEnabled: event.recoveryEnabled,
      },
    };
  }
}
export { NotificationRequest };
