// ID
export { MonitorId } from "./domain/model/monitor/monitor-id.js";
export { DashboardId } from "./domain/model/dashboard/dashboard-id.js";
export { CheckExecutionId } from "./domain/model/check-execution/check-execution-id.js";
export { AlarmId } from "./domain/model/alarm/alarm-id.js";

// Aggregates
export { Monitor } from "./domain/model/monitor/monitor.js";
export { Dashboard } from "./domain/model/dashboard/dashboard.js";
export { CheckExecution } from "./domain/model/check-execution/check-execution.js";
export { Alarm } from "./domain/model/alarm/alarm.js";

// Value Objects
export { MonitorType } from "./domain/model/monitor/monitor-type.js";
export { MonitorStatus, MonitorStatusValue } from "./domain/model/monitor/monitor-status.js";
export { ProbeConfiguration, HttpProbeProps, PingProbeProps, HostProbeProps, HeartbeatProbeProps, ProbeProps } from "./domain/model/monitor/probe-configuration.js";
export { Schedule, ScheduleProps } from "./domain/model/monitor/schedule.js";
export { AssertionRule, AssertionTarget, AssertionOperator, AssertionRuleProps } from "./domain/model/monitor/assertion-rule.js";
export { AlarmPolicy, AlarmPolicyProps } from "./domain/model/monitor/alarm-policy.js";
export { DataExtractor, DataExtractorProps, DisplayHint, ExtractionSchema, ColumnDefinition, KeyValuePairDefinition } from "./domain/model/monitor/data-extractor.js";
export { CheckResult, CheckResultProps } from "./domain/model/check-execution/check-result.js";
export { AssertionResult, AssertionResultProps } from "./domain/model/check-execution/assertion-result.js";
export { ExtractedData, ExtractedDataProps } from "./domain/model/check-execution/extracted-data.js";
export { ProbeOutcome, ProbeOutcomeProps, ProbeHealthStatus, DataAlertLevel } from "./domain/model/check-execution/probe-outcome.js";
export { Severity, SeverityValue } from "./domain/model/alarm/severity.js";
export { AlarmConfirmationStatus, AlarmConfirmationStatusValue } from "./domain/model/alarm/alarm-confirmation-status.js";
export { AlarmPeriod, AlarmPeriodProps } from "./domain/model/alarm/alarm-period.js";
export { FailureAccumulator, FailureAccumulatorProps } from "./domain/model/alarm/failure-accumulator.js";

// Domain Services
export { AssertionEngine } from "./domain/services/assertion-engine.js";
export { AlarmPolicyEvaluator } from "./domain/services/alarm-policy-evaluator.js";
export { StatusTransitionService } from "./domain/services/status-transition-service.js";
export { DashboardResolverService } from "./domain/services/dashboard-resolver-service.js";
export { DataExtractionService } from "./domain/services/data-extraction-service.js";

// Use Cases
export { CreateMonitorUseCase, CreateMonitorInput } from "./application/use-cases/create-monitor.js";
export { ConfigureMonitorUseCase, ConfigureMonitorInput } from "./application/use-cases/configure-monitor.js";
export { ExecuteCheckUseCase, ExecuteCheckInput } from "./application/use-cases/execute-check.js";
export { ProcessHeartbeatUseCase, ProcessHeartbeatInput } from "./application/use-cases/process-heartbeat.js";
export { CreateDashboardUseCase, CreateDashboardInput } from "./application/use-cases/create-dashboard.js";
export { AddMonitorToDashboardUseCase, AddMonitorToDashboardInput } from "./application/use-cases/add-monitor-to-dashboard.js";
export { ResolveAlarmUseCase, ResolveAlarmInput } from "./application/use-cases/resolve-alarm.js";
export { ConfigureDashboardReportsUseCase, ConfigureDashboardReportsInput } from "./application/use-cases/configure-dashboard-reports.js";
export { CloneMonitorUseCase, CloneMonitorInput, CloneMonitorOutput } from "./application/use-cases/clone-monitor.js";

// Ports
export { ProbeExecutor } from "./domain/ports/probe-executor.js";
export { ProbeExecutorRegistry } from "./domain/ports/probe-executor-registry.js";
export { MonitorRepository } from "./domain/ports/monitor-repository.js";
export { DashboardRepository } from "./domain/ports/dashboard-repository.js";
export { CheckExecutionRepository } from "./domain/ports/check-execution-repository.js";
export { AlarmRepository } from "./domain/ports/alarm-repository.js";
export { MonitorQueryRepository, MonitorWithChecksDTO } from "./domain/ports/monitor-query-repository.js";
export { AlarmQueryRepository, AlarmDTO } from "./domain/ports/alarm-query-repository.js";
export { DashboardQueryRepository, DashboardDTO } from "./domain/ports/dashboard-query-repository.js";

// Infrastructure Adapters
export { HttpProbeExecutor } from "./infrastructure/adapters/http-probe-executor.js";
export { HostProbeExecutor } from "./infrastructure/adapters/host-probe-executor.js";
export { PingProbeExecutor } from "./infrastructure/adapters/ping-probe-executor.js";
export { HeartbeatProbeExecutor } from "./infrastructure/adapters/heartbeat-probe-executor.js";
export { MapProbeExecutorRegistry } from "./infrastructure/adapters/map-probe-executor-registry.js";

export { DrizzleMonitorRepository } from "./infrastructure/persistence/drizzle-monitor-repository.js";
export { DrizzleDashboardRepository } from "./infrastructure/persistence/drizzle-dashboard-repository.js";
export { DrizzleCheckExecutionRepository } from "./infrastructure/persistence/drizzle-check-execution-repository.js";
export { DrizzleAlarmRepository } from "./infrastructure/persistence/drizzle-alarm-repository.js";
export { DrizzleMonitorQueryRepository } from "./infrastructure/persistence/drizzle-monitor-query-repository.js";
export { DrizzleAlarmQueryRepository } from "./infrastructure/persistence/drizzle-alarm-query-repository.js";
export { DrizzleDashboardQueryRepository } from "./infrastructure/persistence/drizzle-dashboard-query-repository.js";

// Domain Events
export { MonitorCreated } from "./domain/events/monitor-created.js";
export { MonitorConfigured } from "./domain/events/monitor-configured.js";
export { MonitorStatusChanged } from "./domain/events/monitor-status-changed.js";
export { DashboardCreated } from "./domain/events/dashboard-created.js";
export { MonitorAddedToDashboard } from "./domain/events/monitor-added-to-dashboard.js";
export { DashboardReportConfigured } from "./domain/events/dashboard-report-configured.js";
export { CheckExecuted } from "./domain/events/check-executed.js";
export { AlarmRaised } from "./domain/events/alarm-raised.js";
export { AlarmConfirmed } from "./domain/events/alarm-confirmed.js";
export { AlarmNotified } from "./domain/events/alarm-notified.js";
export { AlarmResolved } from "./domain/events/alarm-resolved.js";
export { AlarmEscalated } from "./domain/events/alarm-escalated.js";
export { DataAlertTriggered } from "./domain/events/data-alert-triggered.js";
export { MonitorDataHealthChanged } from "./domain/events/monitor-data-health-changed.js";

// Event Handlers
export { OnMonitorStatusChanged } from "./application/event-handlers/on-monitor-status-changed.js";
export { OnMonitorDataHealthChanged } from "./application/event-handlers/on-monitor-data-health-changed.js";
export { OnAlarmRaised } from "./application/event-handlers/on-alarm-raised.js";
export { OnCheckExecuted } from "./application/event-handlers/on-check-executed.js";
export { OnDataAlertTriggered } from "./application/event-handlers/on-data-alert-triggered.js";

// Metric/Script Validation
export { MetricRule, MetricRuleProps, MetricOperator, AggregationFunction } from "./domain/model/monitor/metric-rule.js";
export { DataHealthStatus, DataHealthStatusValue } from "./domain/model/monitor/data-health-status.js";
export { MetricResult, MetricResultProps } from "./domain/model/check-execution/metric-result.js";
export { ScriptEvaluator } from "./domain/ports/script-evaluator.js";
export { NodeVmScriptEvaluator } from "./infrastructure/services/node-vm-script-evaluator.js";
export { MetricEvaluationEngine } from "./domain/services/metric-evaluation-engine.js";

// Auth Profiles / Credential Vault
export { AuthProfileId } from "./domain/model/auth-profile/auth-profile-id.js";
export { AuthProfileType } from "./domain/model/auth-profile/auth-profile-type.js";
export { AuthProfile, AuthProfileProps } from "./domain/model/auth-profile/auth-profile.js";
export { CryptoVault } from "./domain/services/crypto-vault.js";
export { AuthProfileRepository } from "./domain/ports/auth-profile-repository.js";
export { AuthProfileQueryRepository, AuthProfileDTO } from "./domain/ports/auth-profile-query-repository.js";
export { DrizzleAuthProfileRepository } from "./infrastructure/persistence/drizzle-auth-profile-repository.js";
export { DrizzleAuthProfileQueryRepository } from "./infrastructure/persistence/drizzle-auth-profile-query-repository.js";
export { MockAuthProfileRepository, MockAuthProfileQueryRepository } from "./infrastructure/adapters/mock-auth-profile-repository.js";
export { CreateAuthProfileUseCase, CreateAuthProfileInput } from "./application/use-cases/create-auth-profile.js";
export { UpdateAuthProfileUseCase, UpdateAuthProfileInput } from "./application/use-cases/update-auth-profile.js";
export { DeleteAuthProfileUseCase, DeleteAuthProfileInput } from "./application/use-cases/delete-auth-profile.js";
export { CloneAuthProfileUseCase, CloneAuthProfileInput } from "./application/use-cases/clone-auth-profile.js";
export { AuthTokenCache, CachedToken } from "./domain/ports/auth-token-cache.js";
export { InMemoryAuthTokenCache } from "./infrastructure/cache/in-memory-auth-token-cache.js";
export { AuthTokenManager, AuthLoginTestResult, extractByJsonPath } from "./domain/services/auth-token-manager.js";


