import { DomainEventBus } from "@monitor/shared-kernel";
import { MonitorId } from "../../domain/model/monitor/monitor-id.js";
import { MonitorStatus } from "../../domain/model/monitor/monitor-status.js";
import { DataHealthStatus } from "../../domain/model/monitor/data-health-status.js";
import { CheckExecution } from "../../domain/model/check-execution/check-execution.js";
import { CheckExecutionId } from "../../domain/model/check-execution/check-execution-id.js";
import { MonitorRepository } from "../../domain/ports/monitor-repository.js";
import { CheckExecutionRepository } from "../../domain/ports/check-execution-repository.js";
import { ProbeExecutorRegistry } from "../../domain/ports/probe-executor-registry.js";
import { AssertionEngine } from "../../domain/services/assertion-engine.js";
import { MetricEvaluationEngine } from "../../domain/services/metric-evaluation-engine.js";
import { DataExtractionService } from "../../domain/services/data-extraction-service.js";
import { ProbeHealthStatus, DataAlertLevel } from "../../domain/model/check-execution/probe-outcome.js";
import { ExtractedData } from "../../domain/model/check-execution/extracted-data.js";
import { MetricResult } from "../../domain/model/check-execution/metric-result.js";
import { CheckResult } from "../../domain/model/check-execution/check-result.js";
import { ScriptEvaluator } from "../../domain/ports/script-evaluator.js";
import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";
import { AuthTokenManager } from "../../domain/services/auth-token-manager.js";
import { ProbeConfiguration } from "../../domain/model/monitor/probe-configuration.js";

export interface ExecuteCheckInput {
  monitorId: string;
}

export class ExecuteCheckUseCase {
  private readonly dataExtractionService: DataExtractionService;
  private readonly metricEvaluationEngine: MetricEvaluationEngine;
  private readonly authTokenManager: AuthTokenManager;

  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkExecutionRepository: CheckExecutionRepository,
    private readonly executorRegistry: ProbeExecutorRegistry,
    private readonly assertionEngine: AssertionEngine,
    private readonly eventBus: DomainEventBus,
    dataExtractionService?: DataExtractionService,
    metricEvaluationEngine?: MetricEvaluationEngine,
    scriptEvaluator?: ScriptEvaluator,
    private readonly authProfileRepository?: AuthProfileRepository,
    authTokenManager?: AuthTokenManager
  ) {
    this.dataExtractionService = dataExtractionService ?? new DataExtractionService();
    this.metricEvaluationEngine = metricEvaluationEngine ?? new MetricEvaluationEngine(scriptEvaluator);
    this.authTokenManager = authTokenManager ?? new AuthTokenManager();
  }

  public async execute(input: ExecuteCheckInput): Promise<CheckExecution | null> {
    const monitorId = MonitorId.create(input.monitorId);
    const monitor = await this.monitorRepository.findById(monitorId);

    if (!monitor) {
      throw new Error(`Monitor with ID ${input.monitorId} not found.`);
    }

    // Se il monitor è sospeso (PAUSED), non eseguiamo il check
    if (monitor.status.value === "PAUSED") {
      return null;
    }

    const timestamp = new Date();

    // 1. Risolvi le credenziali condivise se il monitor HTTP ha un authProfileId collegato
    let effectiveConfig = monitor.probeConfiguration;
    let resolvedProfileId: string | null = null;
    let preflightError: string | null = null;

    if (
      effectiveConfig.type === "HTTP" &&
      effectiveConfig.http?.authProfileId &&
      this.authProfileRepository
    ) {
      resolvedProfileId = effectiveConfig.http.authProfileId;
      try {
        const profile = await this.authProfileRepository.findById(
          AuthProfileId.create(resolvedProfileId)
        );
        if (profile) {
          const authHeaders = await this.authTokenManager.resolveHeaders(profile);
          const mergedHeaders = {
            ...authHeaders,
            ...(effectiveConfig.http.headers || {}),
          };
          effectiveConfig = ProbeConfiguration.createHttp({
            ...effectiveConfig.http,
            headers: mergedHeaders,
          });
        }
      } catch (err: any) {
        preflightError = `Pre-flight Authentication failed: ${err.message || "Errore sconosciuto"}`;
      }
    }

    // 1b. Esegui la sonda fisica (oppure registra il fallimento se il pre-flight è fallito)
    let checkResult: CheckResult;
    if (preflightError) {
      checkResult = CheckResult.createFailure(0, preflightError);
    } else {
      const executor = this.executorRegistry.getExecutor(effectiveConfig.type);
      checkResult = await executor.execute(effectiveConfig);

      // Se la sonda target risponde 401 Unauthorized ed era associata a un profilo auth,
      // invalidiamo la cache del token per forzare un nuovo login al prossimo check
      if (
        (checkResult.statusCode === 401 || (checkResult as any).status === 401) &&
        resolvedProfileId
      ) {
        await this.authTokenManager.invalidate(resolvedProfileId);
      }
    }

    // 2. Valuta le asserzioni di connessione/performance
    const assertionResults = this.assertionEngine.evaluate(
      monitor.assertionRules,
      checkResult
    );

    // 2b. Calcola probeHealth
    let probeHealth: ProbeHealthStatus = "HEALTHY";
    if (checkResult.error) {
      probeHealth = checkResult.error.toLowerCase().includes("timeout") ? "TIMEOUT" : "ERROR";
    } else {
      const hasHealthFailures = assertionResults
        .filter((r) => r.rule.isHealthAssertion)
        .some((r) => !r.passed);
      if (hasHealthFailures) {
        probeHealth = "UNHEALTHY";
      }
    }

    // 2c. Estrai dati e calcola dataAlertLevel valutando le MetricRule
    let extractedData: ExtractedData | undefined = undefined;
    let dataAlertLevel: DataAlertLevel | undefined = undefined;
    let metricResults: MetricResult[] = [];

    const hasDataExtractor = !!monitor.dataExtractor;
    const isHostTypeWithBody = monitor.type.value === "HOST" && checkResult.body;

    if (hasDataExtractor) {
      extractedData = this.dataExtractionService.extract(checkResult, monitor.dataExtractor!);
    } else if (isHostTypeWithBody) {
      try {
        const parsed = JSON.parse(checkResult.body!);
        extractedData = ExtractedData.create(parsed);
      } catch {
        // Ignoriamo errori di parsing se non configurato
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

    // 3. Crea la registrazione dell'esecuzione
    const checkExecution = CheckExecution.create(
      CheckExecutionId.generate(),
      monitorId,
      timestamp,
      checkResult.responseTimeMs,
      probeHealth,
      assertionResults,
      metricResults,
      dataAlertLevel,
      extractedData,
      monitor.name
    );

    // 4. Salva la CheckExecution
    await this.checkExecutionRepository.save(checkExecution);

    // 5. Aggiorna lo stato di disponibilità del monitor in base al risultato del check
    const newStatus =
      checkExecution.status === "DOWN" ? MonitorStatus.DOWN : MonitorStatus.UP;
    monitor.updateStatus(newStatus);

    // 5b. Aggiorna lo stato dei dati del monitor
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

    // 6. Pubblica tutti gli eventi di dominio generati
    const monitorEvents = monitor.pullDomainEvents();
    const executionEvents = checkExecution.pullDomainEvents();

    for (const event of [...executionEvents, ...monitorEvents]) {
      await this.eventBus.publish(event);
    }

    return checkExecution;
  }
}
