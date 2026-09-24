import { DomainEventBus } from "@monitor/shared-kernel";
import { MonitorStatus } from "../../domain/model/monitor/monitor-status.js";
import { DataHealthStatus } from "../../domain/model/monitor/data-health-status.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";
import { CheckExecution } from "../../domain/model/check-execution/check-execution.js";
import { CheckExecutionId } from "../../domain/model/check-execution/check-execution-id.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import { CheckExecutionRepository } from "../../domain/ports/check-execution-repository.js";
import { MetricEvaluationEngine } from "../../domain/services/metric-evaluation-engine.js";
import { DataExtractionService } from "../../domain/services/data-extraction-service.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";
import { ExtractedData } from "../../domain/model/check-execution/extracted-data.js";
import { MetricResult } from "../../domain/model/check-execution/metric-result.js";
import { DataAlertLevel } from "../../domain/model/check-execution/probe-outcome.js";
import { ScriptEvaluator } from "../../domain/ports/script-evaluator.js";

export interface ProcessHeartbeatInput {
  token: string;
  body?: string;
  headers?: Record<string, string>;
  responseTimeMs?: number;
}

export class ProcessHeartbeatUseCase {
  private readonly dataExtractionService: DataExtractionService;
  private readonly metricEvaluationEngine: MetricEvaluationEngine;

  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkExecutionRepository: CheckExecutionRepository,
    private readonly eventBus: DomainEventBus,
    dataExtractionService?: DataExtractionService,
    metricEvaluationEngine?: MetricEvaluationEngine,
    scriptEvaluator?: ScriptEvaluator
  ) {
    this.dataExtractionService = dataExtractionService ?? new DataExtractionService();
    this.metricEvaluationEngine = metricEvaluationEngine ?? new MetricEvaluationEngine(scriptEvaluator);
  }

  public async execute(input: ProcessHeartbeatInput): Promise<CheckExecution | null> {
    const monitor = await this.monitorRepository.findByHeartbeatToken(input.token);

    if (!monitor) {
      throw new Error(`Monitor with heartbeat token "${input.token}" not found.`);
    }

    if (monitor.status.value === "PAUSED") {
      return null;
    }

    const timestamp = new Date();

    // 1. Aggiorna la configurazione del monitor con il timestamp dell'ultimo ping
    const hbProps = monitor.probeConfiguration.heartbeat;
    if (hbProps) {
      const updatedConfig = ProbeConfiguration.createHeartbeat({
        ...hbProps,
        lastPingAt: timestamp.toISOString(),
      });
      monitor.updateProbeConfiguration(updatedConfig);
    }


    // 2. Estrai dati dal payload e valuta eventuali MetricRule
    let extractedData: ExtractedData | undefined = undefined;
    let dataAlertLevel: DataAlertLevel | undefined = undefined;
    let metricResults: MetricResult[] = [];

    if (input.body) {
      const checkResult = CheckResult.createSuccess(
        input.responseTimeMs || 0,
        200,
        input.headers || {},
        input.body
      );

      if (monitor.dataExtractor) {
        extractedData = this.dataExtractionService.extract(checkResult, monitor.dataExtractor);
      } else {
        try {
          const parsed = JSON.parse(input.body);
          if (parsed && typeof parsed === "object") {
            extractedData = ExtractedData.create(parsed);
          }
        } catch {
          // Plain text o payload non-JSON
        }
      }
    }

    if (extractedData) {
      metricResults = await this.metricEvaluationEngine.evaluate(
        monitor.metricRules,
        extractedData
      );
      const hasDataFailures = metricResults.some((r) => !r.passed);
      dataAlertLevel = hasDataFailures ? "CRITICAL" : "NORMAL";
    }

    // 3. Registra l'esecuzione del check
    const checkExecution = CheckExecution.create(
      CheckExecutionId.generate(),
      monitor.id,
      timestamp,
      input.responseTimeMs || 0,
      "HEALTHY",
      [],
      metricResults,
      dataAlertLevel,
      extractedData,
      monitor.name
    );

    await this.checkExecutionRepository.save(checkExecution);

    // 4. Aggiorna lo stato del monitor a UP
    monitor.updateStatus(MonitorStatus.UP);

    // 5. Aggiorna lo stato dei dati
    let newDataHealthStatus = DataHealthStatus.NONE;
    if (extractedData) {
      newDataHealthStatus =
        checkExecution.dataStatus === "CRITICAL"
          ? DataHealthStatus.CRITICAL
          : checkExecution.dataStatus === "WARNING"
          ? DataHealthStatus.WARNING
          : DataHealthStatus.OK;
    }
    monitor.updateDataHealthStatus(newDataHealthStatus);

    await this.monitorRepository.save(monitor);

    // 6. Pubblica eventi di dominio
    const monitorEvents = monitor.pullDomainEvents();
    const executionEvents = checkExecution.pullDomainEvents();

    for (const event of [...executionEvents, ...monitorEvents]) {
      await this.eventBus.publish(event);
    }

    return checkExecution;
  }
}
