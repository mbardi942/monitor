import { PgDatabase } from "drizzle-orm/pg-core";
import { CheckExecutionRepository } from "../../domain/ports/check-execution-repository.js";
import { CheckExecution } from "../../domain/model/check-execution/check-execution.js";
import { checkExecutions } from "@monitor/db";

export class DrizzleCheckExecutionRepository implements CheckExecutionRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  public async save(checkExecution: CheckExecution): Promise<void> {
    await this.db.insert(checkExecutions).values({
      id: checkExecution.id.toString(),
      monitorId: checkExecution.monitorId.toString(),
      timestamp: checkExecution.timestamp,
      status: checkExecution.status,
      probeHealth: checkExecution.probeHealth,
      dataAlertLevel: checkExecution.dataAlertLevel || null,
      responseTimeMs: checkExecution.responseTimeMs,
      extractedData: checkExecution.extractedData ? checkExecution.extractedData.toValue() : null,
      assertionResults: checkExecution.assertionResults.map((res) => res.toValue()),
      createdAt: checkExecution.createdAt,
    });
  }
}
