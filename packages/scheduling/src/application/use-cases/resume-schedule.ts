import { ScheduleRepository } from "../../domain/ports/schedule-repository.js";
import { SchedulerGateway } from "../../domain/ports/scheduler-gateway.js";

export interface ResumeScheduleInput {
  targetId: string;
  targetType: "MONITOR" | "REPORT";
}

export class ResumeScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly schedulerGateway: SchedulerGateway
  ) {}

  public async execute(input: ResumeScheduleInput): Promise<void> {
    const schedule = await this.scheduleRepository.findByTarget(input.targetId, input.targetType);

    if (!schedule) {
      console.warn(`[ResumeScheduleUseCase] Schedule not found for target ${input.targetId} (${input.targetType})`);
      return;
    }

    if (!schedule.isActive) {
      schedule.activate();
      await this.scheduleRepository.save(schedule);
      await this.schedulerGateway.schedule(schedule);
    }
  }
}
