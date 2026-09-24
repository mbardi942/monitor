import { DomainEventBus } from "@monitor/shared-kernel";
import { AlarmId } from "../../domain/model/alarm/alarm-id.js";
import { AlarmRepository } from "../../domain/ports/alarm-repository.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";

export interface ResolveAlarmInput {
  alarmId: string;
}

export class ResolveAlarmUseCase {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly monitorRepository: MonitorRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: ResolveAlarmInput): Promise<void> {
    const alarmId = AlarmId.create(input.alarmId);
    const alarm = await this.alarmRepository.findById(alarmId);

    if (!alarm) {
      throw new Error(`Alarm with ID ${input.alarmId} not found.`);
    }

    if (alarm.confirmationStatus.value === "RESOLVED") {
      return;
    }

    const monitor = await this.monitorRepository.findById(alarm.monitorId);
    if (!monitor) {
      throw new Error(`Monitor with ID ${alarm.monitorId.toString()} not found for alarm ${input.alarmId}.`);
    }

    // Risoluzione manuale dell'allarme
    alarm.resolve(monitor.name, monitor.alarmPolicy.recoveryNotificationEnabled);
    
    // Salvataggio sul database
    await this.alarmRepository.save(alarm);

    // Pubblicazione degli eventi
    const events = alarm.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
}
