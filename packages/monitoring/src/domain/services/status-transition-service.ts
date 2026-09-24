import { MonitorStatus } from "../model/monitor/monitor-status.js";

export class StatusTransitionService {
  /**
   * Determina e valida il prossimo stato del monitor in base allo stato attuale
   * e al risultato dell'ultimo check.
   */
  public determineNextStatus(
    currentStatus: MonitorStatus,
    checkStatus: "UP" | "DOWN" | "DEGRADED"
  ): MonitorStatus {
    if (currentStatus.value === "PAUSED") {
      return currentStatus;
    }

    const nextStatus = MonitorStatus.create(checkStatus);
    
    if (!currentStatus.canTransitionTo(nextStatus)) {
      throw new Error(`Cannot transition monitor status from ${currentStatus.value} to ${nextStatus.value}`);
    }

    return nextStatus;
  }
}
