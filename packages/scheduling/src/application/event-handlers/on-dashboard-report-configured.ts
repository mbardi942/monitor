import { DashboardReportConfigured } from "@monitor/monitoring";
import { RegisterScheduleUseCase } from "../use-cases/register-schedule.js";
import { PauseScheduleUseCase } from "../use-cases/pause-schedule.js";

export class OnDashboardReportConfigured {
  constructor(
    private readonly registerScheduleUseCase: RegisterScheduleUseCase,
    private readonly pauseScheduleUseCase: PauseScheduleUseCase
  ) {}

  public async handle(event: DashboardReportConfigured): Promise<void> {
    const { dashboardId, isEnabled, cron } = event;

    if (isEnabled) {
      if (!cron) {
        return;
      }
      await this.registerScheduleUseCase.execute({
        targetId: dashboardId,
        targetType: "REPORT",
        cron: cron,
        intervalSeconds: null,
      });
    } else {
      await this.pauseScheduleUseCase.execute({
        targetId: dashboardId,
        targetType: "REPORT",
      });
    }
  }
}
