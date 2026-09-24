import { Alarm } from "../model/alarm/alarm.js";
import { AlarmPolicy } from "../model/monitor/alarm-policy.js";

export class AlarmPolicyEvaluator {
  /**
   * Determina se l'allarme in stato OPEN soddisfa le condizioni configurate
   * nella politica del monitor per essere confermato.
   */
  public shouldConfirm(alarm: Alarm, policy: AlarmPolicy, evaluationTime: Date = new Date()): boolean {
    if (alarm.confirmationStatus.value !== "OPEN") {
      return false;
    }

    const accumulator = alarm.failureAccumulator;
    
    // Verifica dei fallimenti consecutivi
    const meetsConsecutive = accumulator.consecutiveFailureCount >= policy.consecutiveFailures;

    // Verifica della durata dell'inattività (se configurata)
    if (policy.downtimeDurationMinutes !== undefined && policy.downtimeDurationMinutes > 0) {
      const downtimeMs = evaluationTime.getTime() - accumulator.firstFailureAt.getTime();
      const targetMs = policy.downtimeDurationMinutes * 60 * 1000;
      const meetsDuration = downtimeMs >= targetMs;
      
      // La logica è OR: scatta al primo dei due limiti raggiunti
      return meetsConsecutive || meetsDuration;
    }

    return meetsConsecutive;
  }
}
