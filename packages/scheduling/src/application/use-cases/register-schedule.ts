import { Schedule, ScheduleId } from "../../domain/model/schedule.js";
import { ScheduleRepository } from "../../domain/ports/schedule-repository.js";
import { SchedulerGateway } from "../../domain/ports/scheduler-gateway.js";

export interface RegisterScheduleInput {
  targetId: string;
  targetType: "MONITOR" | "REPORT";
  cron: string | null;
  intervalSeconds: number | null;
}

export class RegisterScheduleUseCase {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly schedulerGateway: SchedulerGateway
  ) {}

  public async execute(input: RegisterScheduleInput): Promise<Schedule> {
    let schedule = await this.scheduleRepository.findByTarget(input.targetId, input.targetType);

    if (schedule) {
      // Aggiorna lo schedule esistente
      schedule.update(input.cron, input.intervalSeconds);
      schedule.activate();
    } else {
      // Crea un nuovo schedule
      const id = ScheduleId.generate();
      schedule = Schedule.create(
        id,
        input.targetId,
        input.targetType,
        input.cron,
        input.intervalSeconds
      );
    }

    // Persisti lo schedule
    await this.scheduleRepository.save(schedule);

    // Registra nell'engine di scheduling concreto (BullMQ)
    await this.schedulerGateway.schedule(schedule);

    return schedule;
  }
}
