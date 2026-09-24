import { Monitor } from "../model/monitor/monitor.js";
import { MonitorId } from "../model/monitor/monitor-id.js";

export interface MonitorRepository {
  findById(id: MonitorId): Promise<Monitor | null>;
  findByHeartbeatToken(token: string): Promise<Monitor | null>;
  save(monitor: Monitor): Promise<void>;
  delete(id: MonitorId): Promise<void>;
}

