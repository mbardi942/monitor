import { eq, sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import { Monitor } from "../../domain/model/monitor/monitor.js";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { MonitorType } from "../../domain/model/monitor/monitor-type.js";
import { MonitorStatus } from "../../domain/model/monitor/monitor-status.js";
import { DataHealthStatus } from "../../domain/model/monitor/data-health-status.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { Schedule } from "../../domain/model/monitor/schedule.js";
import { AssertionRule } from "../../domain/model/monitor/assertion-rule.js";
import { MetricRule } from "../../domain/model/monitor/metric-rule.js";
import { AlarmPolicy } from "../../domain/model/monitor/alarm-policy.js";
import { DataExtractor } from "../../domain/model/monitor/data-extractor.js";
import { monitors } from "@monitor/db";

export class DrizzleMonitorRepository implements MonitorRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  private mapToDomain(row: any): Monitor {
    const probeConfig = row.probeConfiguration as any;
    const scheduleVal = row.schedule as any;
    const rulesVal = (row.assertionRules as any[]) || [];
    const policyVal = row.alarmPolicy as any;
    const recipientIdsVal = (row.recipientIds as string[]) || [];

    const extractorVal = row.dataExtractor as any;
    const metricRulesVal = extractorVal?.metricRules || [];
    const dataHealthStatusVal = extractorVal?.dataHealthStatus || "NONE";

    // Estrattore vero e proprio presente solo se ha lo schema definito
    const hasExtractor = extractorVal && (extractorVal.schema || extractorVal.displayHint);

    return Monitor.reconstitute(
      MonitorId.create(row.id),
      row.name,
      MonitorType.create(row.type),
      MonitorStatus.create(row.status),
      ProbeConfiguration.create(probeConfig.type, probeConfig),
      Schedule.create(scheduleVal),
      rulesVal.map((r) => AssertionRule.create(r)),
      AlarmPolicy.create(policyVal),
      row.createdAt,
      row.updatedAt,
      hasExtractor ? DataExtractor.create(extractorVal) : undefined,
      metricRulesVal.map((r: any) => MetricRule.create(r)),
      DataHealthStatus.create(dataHealthStatusVal),
      recipientIdsVal
    );
  }

  public async findById(id: MonitorId): Promise<Monitor | null> {
    const results = await this.db
      .select()
      .from(monitors)
      .where(eq(monitors.id, id.toString()));

    if (results.length === 0) {
      return null;
    }

    return this.mapToDomain(results[0]);
  }

  public async findByHeartbeatToken(token: string): Promise<Monitor | null> {
    const results = await this.db
      .select()
      .from(monitors)
      .where(sql`${monitors.probeConfiguration}->'heartbeat'->>'token' = ${token}`);

    if (results.length === 0) {
      return null;
    }

    return this.mapToDomain(results[0]);
  }


  public async save(monitor: Monitor): Promise<void> {
    // Aggreghiamo metricRules e dataHealthStatus all'interno dell'oggetto JSON dell'estrattore
    const extractorData = monitor.dataExtractor 
      ? {
          ...monitor.dataExtractor.toValue(),
          metricRules: monitor.metricRules.map((r) => r.toValue()),
          dataHealthStatus: monitor.dataHealthStatus.value,
        }
      : (monitor.metricRules.length > 0 || monitor.dataHealthStatus.value !== "NONE"
          ? {
              metricRules: monitor.metricRules.map((r) => r.toValue()),
              dataHealthStatus: monitor.dataHealthStatus.value,
            }
          : null);

    const values = {
      id: monitor.id.toString(),
      name: monitor.name,
      type: monitor.type.value,
      status: monitor.status.value,
      probeConfiguration: monitor.probeConfiguration.toValue(),
      schedule: monitor.schedule.toValue(),
      assertionRules: monitor.assertionRules.map((r) => r.toValue()),
      alarmPolicy: monitor.alarmPolicy.toValue(),
      recipientIds: monitor.recipientIds,
      dataExtractor: extractorData,
      createdAt: monitor.createdAt,
      updatedAt: monitor.updatedAt,
    };

    await this.db
      .insert(monitors)
      .values(values)
      .onConflictDoUpdate({
        target: monitors.id,
        set: {
          name: values.name,
          status: values.status,
          probeConfiguration: values.probeConfiguration,
          schedule: values.schedule,
          assertionRules: values.assertionRules,
          alarmPolicy: values.alarmPolicy,
          recipientIds: values.recipientIds,
          dataExtractor: values.dataExtractor,
          updatedAt: values.updatedAt,
        },
      });
  }

  public async delete(id: MonitorId): Promise<void> {
    await this.db.delete(monitors).where(eq(monitors.id, id.toString()));
  }
}
