import { ScheduleRepository } from "../../domain/ports/schedule-repository.js";
import { SchedulerGateway } from "../../domain/ports/scheduler-gateway.js";

export interface PauseScheduleInput {
  targetId: string;
  targetType: "MONITOR" | "REPORT";
}

export class PauseScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly schedulerGateway: SchedulerGateway
  ) {}

  public async execute(input: PauseScheduleInput): Promise<void> {
    const schedule = await this.scheduleRepository.findByTarget(input.targetId, input.targetType);

    if (!schedule) {
      console.warn(`[PauseScheduleUseCase] Schedule not found for target ${input.targetId} (${input.targetType})`);
      return;
    }

    if (schedule.isActive) {
      schedule.deactivate();
      await this.scheduleRepository.save(schedule);
      await this.schedulerGateway.unschedule(schedule.targetId, schedule.targetType);
    }
  }
}
