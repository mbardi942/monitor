import { MonitorStatusChanged } from "@monitor/monitoring";
import { PauseScheduleUseCase } from "../use-cases/pause-schedule.js";
import { ResumeScheduleUseCase } from "../use-cases/resume-schedule.js";

export class OnMonitorStatusChanged {
  constructor(
    private readonly pauseScheduleUseCase: PauseScheduleUseCase,
    private readonly resumeScheduleUseCase: ResumeScheduleUseCase
  ) {}

  public async handle(event: MonitorStatusChanged): Promise<void> {
    const { monitorId, oldStatus, newStatus } = event;

    if (newStatus === "PAUSED") {
      await this.pauseScheduleUseCase.execute({
        targetId: monitorId,
        targetType: "MONITOR",
      });
    } else if (oldStatus === "PAUSED") {
      // Se era in pausa e ora passa a UP o altro stato attivo, riavviamo lo scheduler
      await this.resumeScheduleUseCase.execute({
        targetId: monitorId,
        targetType: "MONITOR",
      });
    }
  }
}
