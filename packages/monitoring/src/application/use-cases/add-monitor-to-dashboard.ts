import { DomainEventBus } from "@monitor/shared-kernel";
import { DashboardId } from "../../domain/model/dashboard/dashboard-id.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { DashboardRepository } from "../../domain/ports/dashboard-repository.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";

export interface AddMonitorToDashboardInput {
  dashboardId: string;
  monitorId: string;
}

export class AddMonitorToDashboardUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly monitorRepository: MonitorRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: AddMonitorToDashboardInput): Promise<void> {
    const dashboardId = DashboardId.create(input.dashboardId);
    const monitorId = MonitorId.create(input.monitorId);

    const dashboard = await this.dashboardRepository.findById(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard with ID ${input.dashboardId} not found.`);
    }

    const monitor = await this.monitorRepository.findById(monitorId);
    if (!monitor) {
      throw new Error(`Monitor with ID ${input.monitorId} not found.`);
    }

    dashboard.addMonitor(monitorId);

    await this.dashboardRepository.save(dashboard);

    const events = dashboard.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
}
