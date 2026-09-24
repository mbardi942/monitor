import { AggregateRoot } from "@monitor/shared-kernel";
import { CheckExecutionId } from "./check-execution-id.js";
import { MonitorId } from "../monitor/monitor-id.js";
import { AssertionResult } from "./assertion-result.js";
import { MetricResult } from "./metric-result.js";
import { ExtractedData } from "./extracted-data.js";
import { ProbeHealthStatus, DataAlertLevel } from "./probe-outcome.js";
import { CheckExecuted } from "../../events/check-executed.js";
import { DataAlertTriggered } from "../../events/data-alert-triggered.js";

export class CheckExecution extends AggregateRoot<CheckExecutionId> {
  private readonly _monitorId: MonitorId;
  private readonly _timestamp: Date;
  private readonly _probeHealth: ProbeHealthStatus;
  private readonly _dataAlertLevel?: DataAlertLevel;
  private readonly _responseTimeMs: number;
  private readonly _extractedData?: ExtractedData;
  private readonly _assertionResults: AssertionResult[];
  private readonly _metricResults: MetricResult[];
  private readonly _createdAt: Date;

  private constructor(
    id: CheckExecutionId,
    monitorId: MonitorId,
    timestamp: Date,
    probeHealth: ProbeHealthStatus,
    responseTimeMs: number,
    assertionResults: AssertionResult[],
    metricResults: MetricResult[],
    dataAlertLevel?: DataAlertLevel,
    extractedData?: ExtractedData,
    createdAt: Date = new Date()
  ) {
    super(id);
    this._monitorId = monitorId;
    this._timestamp = timestamp;
    this._probeHealth = probeHealth;
    this._dataAlertLevel = dataAlertLevel;
    this._responseTimeMs = responseTimeMs;
    this._assertionResults = assertionResults;
    this._metricResults = metricResults;
    this._extractedData = extractedData;
    this._createdAt = createdAt;
  }

  // Getters
  public get monitorId(): MonitorId { return this._monitorId; }
  public get timestamp(): Date { return this._timestamp; }
  
  public get status(): "UP" | "DOWN" {
    if (this._probeHealth !== "HEALTHY") {
      return "DOWN";
    }
    return "UP";
  }

  public get dataStatus(): "OK" | "WARNING" | "CRITICAL" | "NONE" {
    if (!this._dataAlertLevel || this._dataAlertLevel === "NORMAL") {
      return "OK";
    }
    if (this._dataAlertLevel === "WARNING") {
      return "WARNING";
    }
    if (this._dataAlertLevel === "CRITICAL") {
      return "CRITICAL";
    }
    return "NONE";
  }

  public get probeHealth(): ProbeHealthStatus { return this._probeHealth; }
  public get dataAlertLevel(): DataAlertLevel | undefined { return this._dataAlertLevel; }
  public get responseTimeMs(): number { return this._responseTimeMs; }
  public get extractedData(): ExtractedData | undefined { return this._extractedData; }
  public get assertionResults(): AssertionResult[] { return [...this._assertionResults]; }
  public get metricResults(): MetricResult[] { return [...this._metricResults]; }
  public get createdAt(): Date { return this._createdAt; }

  /**
   * Factory per creare ed innescare una nuova CheckExecution
   */
  public static create(
    id: CheckExecutionId,
    monitorId: MonitorId,
    timestamp: Date,
    responseTimeMs: number,
    probeHealth: ProbeHealthStatus,
    assertionResults: AssertionResult[],
    metricResults: MetricResult[],
    dataAlertLevel?: DataAlertLevel,
    extractedData?: ExtractedData,
    monitorName: string = ""
  ): CheckExecution {
    const execution = new CheckExecution(
      id,
      monitorId,
      timestamp,
      probeHealth,
      responseTimeMs,
      assertionResults,
      metricResults,
      dataAlertLevel,
      extractedData,
      new Date()
    );

    execution.addDomainEvent(
      new CheckExecuted(
        id.toString(),
        monitorId.toString(),
        timestamp,
        execution.status,
        responseTimeMs,
        extractedData?.toValue().values,
        assertionResults.map((res) => res.toValue()),
        metricResults.map((res) => res.toValue()),
        probeHealth,
        dataAlertLevel,
        execution.dataStatus
      )
    );

    if (dataAlertLevel && dataAlertLevel !== "NORMAL") {
      const failed = metricResults
        .filter((res) => !res.passed)
        .map((res) => ({
          rule: res.rule.isCustomScript
            ? `Script: ${res.rule.script?.slice(0, 30)}...`
            : `${res.rule.property} ${res.rule.operator} ${res.rule.value}`,
          actual: res.actualValue ?? "N/A",
          expected: res.rule.value ?? "N/A",
        }));

      execution.addDomainEvent(
        new DataAlertTriggered(
          id.toString(),
          monitorId.toString(),
          monitorName,
          dataAlertLevel,
          failed,
          [],
          extractedData?.toValue().values
        )
      );
    }

    return execution;
  }

  /**
   * Ricostruisce l'aggregato (usato per persistenza)
   */
  public static reconstitute(
    id: CheckExecutionId,
    monitorId: MonitorId,
    timestamp: Date,
    probeHealth: ProbeHealthStatus,
    responseTimeMs: number,
    assertionResults: AssertionResult[],
    metricResults: MetricResult[],
    dataAlertLevel?: DataAlertLevel,
    extractedData?: ExtractedData,
    createdAt: Date = new Date()
  ): CheckExecution {
    return new CheckExecution(
      id,
      monitorId,
      timestamp,
      probeHealth,
      responseTimeMs,
      assertionResults,
      metricResults,
      dataAlertLevel,
      extractedData,
      createdAt
    );
  }
}
