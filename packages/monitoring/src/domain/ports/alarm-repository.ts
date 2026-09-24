import { Alarm, AlarmType } from "../model/alarm/alarm.js";
import { AlarmId } from "../model/alarm/alarm-id.js";
import { MonitorId } from "../model/monitor/monitor-id.js";

export interface AlarmRepository {
  findById(id: AlarmId): Promise<Alarm | null>;
  findActiveByMonitorId(monitorId: MonitorId, type?: AlarmType): Promise<Alarm | null>;
  save(alarm: Alarm): Promise<void>;
  findHistory(): Promise<Alarm[]>;
}
