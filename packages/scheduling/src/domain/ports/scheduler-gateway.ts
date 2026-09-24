import { Schedule } from "../model/schedule.js";

export interface SchedulerGateway {
  schedule(schedule: Schedule): Promise<void>;
  unschedule(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<void>;
}
