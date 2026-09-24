import { MonitorConfigured } from "@monitor/monitoring";
import { RegisterScheduleUseCase } from "../use-cases/register-schedule.js";

export class OnMonitorConfigured {
  constructor(private readonly registerScheduleUseCase: RegisterScheduleUseCase) {}

  public async handle(event: MonitorConfigured): Promise<void> {
    const { monitorId, schedule } = event;

    // Se non ci sono indicazioni di scheduling, non facciamo nulla (anche se lo schema ne richiede almeno uno)
    if (!schedule.intervalSeconds && !schedule.cron) {
      return;
    }

    await this.registerScheduleUseCase.execute({
      targetId: monitorId,
      targetType: "MONITOR",
      cron: schedule.cron || null,
      intervalSeconds: schedule.intervalSeconds || null,
    });
  }
}
