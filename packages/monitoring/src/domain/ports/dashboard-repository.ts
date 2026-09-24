import { Dashboard } from "../model/dashboard/dashboard.js";
import { DashboardId } from "../model/dashboard/dashboard-id.js";
import { MonitorId } from "../model/monitor/monitor-id.js";

export interface DashboardRepository {
  findById(id: DashboardId): Promise<Dashboard | null>;
  save(dashboard: Dashboard): Promise<void>;
  findByMonitorId(monitorId: MonitorId): Promise<Dashboard[]>;
}
