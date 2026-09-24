import { DomainEventBus } from "@monitor/shared-kernel";
import { Dashboard } from "../../domain/model/dashboard/dashboard.js";
import { DashboardId } from "../../domain/model/dashboard/dashboard-id.js";
import { DashboardReportConfig, DashboardReportConfigProps } from "../../domain/model/dashboard/dashboard-report-config.js";
import { DashboardRepository } from "../../domain/ports/dashboard-repository.js";

export interface CreateDashboardInput {
  name: string;
  tenantId: string;
  reportConfig?: DashboardReportConfigProps;
}

export class CreateDashboardUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: CreateDashboardInput): Promise<Dashboard> {
    const id = DashboardId.generate();
    const reportConfig = input.reportConfig
      ? DashboardReportConfig.create(input.reportConfig)
      : DashboardReportConfig.createDisabled();

    const dashboard = Dashboard.create(id, input.name, input.tenantId, reportConfig);

    await this.dashboardRepository.save(dashboard);

    const events = dashboard.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return dashboard;
  }
}
