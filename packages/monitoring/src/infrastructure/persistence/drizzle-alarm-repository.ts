import { eq, and, ne } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { AlarmRepository } from "../../domain/ports/alarm-repository.js";
import { Alarm, AlarmType } from "../../domain/model/alarm/alarm.js";
import { AlarmId } from "../../domain/model/alarm/alarm-id.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { Severity } from "../../domain/model/alarm/severity.js";
import { AlarmConfirmationStatus } from "../../domain/model/alarm/alarm-confirmation-status.js";
import { AlarmPeriod } from "../../domain/model/alarm/alarm-period.js";
import { FailureAccumulator } from "../../domain/model/alarm/failure-accumulator.js";
import { CheckExecutionId } from "../../domain/model/check-execution/check-execution-id.js";
import { alarms } from "@monitor/db";

export class DrizzleAlarmRepository implements AlarmRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async findById(id: AlarmId): Promise<Alarm | null> {
    const results = await this.db
      .select()
      .from(alarms)
      .where(eq(alarms.id, id.toString()));

    if (results.length === 0) {
      return null;
    }

    return this.mapToDomain(results[0]);
  }

  public async findActiveByMonitorId(monitorId: MonitorId, type?: AlarmType): Promise<Alarm | null> {
    const results = await this.db
      .select()
      .from(alarms)
      .where(
        and(
          eq(alarms.monitorId, monitorId.toString()),
          ne(alarms.status, "RESOLVED")
        )
      );

    if (results.length === 0) {
      return null;
    }

    const domainAlarms = results.map((row) => this.mapToDomain(row));
    if (type) {
      return domainAlarms.find((a) => a.alarmType === type) || null;
    }
    return domainAlarms[0];
  }

  public async save(alarm: Alarm): Promise<void> {
    const values = {
      id: alarm.id.toString(),
      monitorId: alarm.monitorId.toString(),
      status: alarm.confirmationStatus.value,
      severity: alarm.severity.value,
      openedAt: alarm.period.openedAt,
      confirmedAt: alarm.period.confirmedAt || null,
      resolvedAt: alarm.period.resolvedAt || null,
      failureAccumulator: {
        consecutiveFailureCount: alarm.failureAccumulator.consecutiveFailureCount,
        firstFailureAt: alarm.failureAccumulator.firstFailureAt.toISOString(),
        notifiedAt: alarm.period.notifiedAt ? alarm.period.notifiedAt.toISOString() : null,
        triggerCheckExecutionId: alarm.triggerCheckExecutionId.toString(),
        alarmType: alarm.alarmType,
      },
      createdAt: alarm.createdAt,
      updatedAt: alarm.updatedAt,
    };

    await this.db
      .insert(alarms)
      .values(values)
      .onConflictDoUpdate({
        target: alarms.id,
        set: {
          status: values.status,
          severity: values.severity,
          confirmedAt: values.confirmedAt,
          resolvedAt: values.resolvedAt,
          failureAccumulator: values.failureAccumulator,
          updatedAt: values.updatedAt,
        },
      });
  }

  public async findHistory(): Promise<Alarm[]> {
    const results = await this.db
      .select()
      .from(alarms)
      .orderBy(alarms.openedAt);

    return results.map((row) => this.mapToDomain(row));
  }

  private mapToDomain(row: any): Alarm {
    const accumulatorVal = row.failureAccumulator as any;
    const alarmType = (accumulatorVal.alarmType as AlarmType) || "AVAILABILITY";

    return Alarm.reconstitute(
      AlarmId.create(row.id),
      MonitorId.create(row.monitorId),
      Severity.create(row.severity),
      AlarmConfirmationStatus.create(row.status),
      AlarmPeriod.create({
        openedAt: row.openedAt,
        confirmedAt: row.confirmedAt || undefined,
        resolvedAt: row.resolvedAt || undefined,
        notifiedAt: accumulatorVal.notifiedAt ? new Date(accumulatorVal.notifiedAt) : undefined,
      }),
      FailureAccumulator.create({
        consecutiveFailureCount: accumulatorVal.consecutiveFailureCount,
        firstFailureAt: new Date(accumulatorVal.firstFailureAt),
      }),
      CheckExecutionId.create(accumulatorVal.triggerCheckExecutionId),
      row.createdAt,
      row.updatedAt,
      alarmType
    );
  }
}
