import { Schedule } from "../model/schedule.js";

export interface ScheduleRepository {
  save(schedule: Schedule): Promise<void>;
  findByTarget(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<Schedule | null>;
}
