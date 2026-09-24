import { DomainEventBus } from "@monitor/shared-kernel";
import { DashboardId } from "../../domain/model/dashboard/dashboard-id.js";
import { DashboardReportConfig } from "../../domain/model/dashboard/dashboard-report-config.js";
import { DashboardRepository } from "../../domain/ports/dashboard-repository.js";
import { Dashboard } from "../../domain/model/dashboard/dashboard.js";

export interface ConfigureDashboardReportsInput {
  dashboardId: string;
  isEnabled: boolean;
  cron?: string;
}

export class ConfigureDashboardReportsUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  public async execute(input: ConfigureDashboardReportsInput): Promise<Dashboard> {
    const dashboardId = DashboardId.create(input.dashboardId);
    const dashboard = await this.dashboardRepository.findById(dashboardId);

    if (!dashboard) {
      throw new Error(`Dashboard with ID ${input.dashboardId} not found.`);
    }

    const reportConfig = input.isEnabled
      ? DashboardReportConfig.create({ isEnabled: true, cron: input.cron })
      : DashboardReportConfig.createDisabled();

    dashboard.configureReports(reportConfig);

    await this.dashboardRepository.save(dashboard);

    // Pubblica gli eventi accumulati (DashboardReportConfigured)
    const events = dashboard.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return dashboard;
  }
}
