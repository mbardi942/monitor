import { eq, and } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { ScheduleRepository } from "../../domain/ports/schedule-repository.js";
import { Schedule, ScheduleId } from "../../domain/model/schedule.js";
import { schedules } from "@monitor/db";

export class DrizzleScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findByTarget(targetId: string, targetType: "MONITOR" | "REPORT"): Promise<Schedule | null> {
    const results = await this.db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.targetId, targetId),
          eq(schedules.targetType, targetType)
        )
      );

    if (results.length === 0) {
      return null;
    }

    const row = results[0];

    return Schedule.reconstitute(
      ScheduleId.create(row.id),
      {
        targetId: row.targetId,
        targetType: row.targetType as "MONITOR" | "REPORT",
        cron: row.cron,
        intervalSeconds: row.intervalSeconds,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    );
  }

  public async save(schedule: Schedule): Promise<void> {
    const values = {
      id: schedule.id.toString(),
      targetId: schedule.targetId,
      targetType: schedule.targetType,
      cron: schedule.cron,
      intervalSeconds: schedule.intervalSeconds,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };

    await this.db
      .insert(schedules)
      .values(values)
      .onConflictDoUpdate({
        target: schedules.id,
        set: {
          cron: values.cron,
          intervalSeconds: values.intervalSeconds,
          isActive: values.isActive,
          updatedAt: values.updatedAt,
        },
      });
  }
}
