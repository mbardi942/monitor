import { DashboardId } from "../model/dashboard/dashboard-id.js";
import { MonitorId } from "../model/monitor/monitor-id.js";
import { DashboardRepository } from "../ports/dashboard-repository.js";

export class DashboardResolverService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  /**
   * Trova tutte le dashboard associate a un determinato monitor e ne restituisce gli ID.
   */
  public async findDashboardsByMonitorId(monitorId: MonitorId): Promise<DashboardId[]> {
    const dashboards = await this.dashboardRepository.findByMonitorId(monitorId);
    return dashboards.map((d) => d.id);
  }
}
