import { Redis } from "ioredis";

import { InMemoryEventBus } from "@monitor/event-bus";
import {
  DrizzleMonitorRepository,
  DrizzleCheckExecutionRepository,
  DrizzleAlarmRepository,
  DrizzleDashboardRepository,
  CreateMonitorUseCase,
  ConfigureMonitorUseCase,
  ExecuteCheckUseCase,
  CreateDashboardUseCase,
  AddMonitorToDashboardUseCase,
  ResolveAlarmUseCase,
  ConfigureDashboardReportsUseCase,
  CloneMonitorUseCase,
  DrizzleAuthProfileRepository,
  CreateAuthProfileUseCase,
  UpdateAuthProfileUseCase,
  DeleteAuthProfileUseCase,
  CloneAuthProfileUseCase,
  AssertionEngine,
  AlarmPolicyEvaluator,
  StatusTransitionService,
  DashboardResolverService,
  HttpProbeExecutor,
  HostProbeExecutor,
  PingProbeExecutor,
  HeartbeatProbeExecutor,
  MapProbeExecutorRegistry,
  ProcessHeartbeatUseCase,
  OnCheckExecuted,

  OnMonitorStatusChanged,
  OnMonitorDataHealthChanged,
  OnAlarmRaised,
  OnDataAlertTriggered,
  NodeVmScriptEvaluator,
  AuthTokenManager,
  InMemoryAuthTokenCache,
} from "@monitor/monitoring";
import {
  DrizzleRecipientListRepository,
  DrizzleNotificationRepository,
  ResendEmailSender,
  SlackWebhookSender,
  NotificationRoutingService,
  DeliverNotificationUseCase,
  OnAlarmConfirmed,
  OnAlarmResolved,
  OnReportConfirmed,
} from "@monitor/notification";
import {
  DrizzleReportRepository,
  DrizzleReportTemplateRepository,
  DrizzleCheckDataReader,
  ReportAggregationService,
  GenerateReportUseCase,
  EditReportUseCase,
  ConfirmReportUseCase,
  OnReportScheduleTriggered,
  OnNotificationDelivered,
} from "@monitor/reporting";
import {
  DrizzleScheduleRepository,
  BullMQSchedulerGateway,
  RegisterScheduleUseCase,
  PauseScheduleUseCase,
  ResumeScheduleUseCase,
  OnMonitorConfigured,
  OnMonitorStatusChanged as OnMonitorStatusChangedScheduling,
  OnDashboardReportConfigured,
} from "@monitor/scheduling";

import { db, useMock } from "./backend-runtime";

// Re-export del runtime di lettura per retrocompatibilita degli import esistenti.
export { db, useMock };
export {
  monitorQueryRepository,
  alarmQueryRepository,
  reportQueryRepository,
  recipientQueryRepository,
} from "./backend-read";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Composition root dei COMANDI: Redis, event bus, scheduler, use case e handler.
// I singleton sono mantenuti in globalThis per sopravvivere all'HMR in sviluppo.
interface GlobalCommands {
  redis?: Redis;
  eventBus?: InMemoryEventBus;
  schedulerGateway?: BullMQSchedulerGateway;
  commandsInitialized?: boolean;
  listenersRegistered?: boolean;
}

const globalRef = globalThis as unknown as GlobalCommands;

if (!globalRef.commandsInitialized) {
  if (!useMock) {
    const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    globalRef.redis = redis;
    globalRef.eventBus = new InMemoryEventBus();
    globalRef.schedulerGateway = new BullMQSchedulerGateway(redis);
  } else {
    // In mock mode serve solo l'event bus in-memory
    globalRef.eventBus = new InMemoryEventBus();
  }
  globalRef.commandsInitialized = true;
}

// Estrazione singletons
export const redis = useMock ? ({} as any) : globalRef.redis!;
export const eventBus = globalRef.eventBus!;
export const schedulerGateway = useMock
  ? ({ schedule: async () => {}, unschedule: async () => {}, close: async () => {} } as any)
  : globalRef.schedulerGateway!;

// 4. Inizializzazione Repository
export const monitorRepository = useMock ? ({} as any) : new DrizzleMonitorRepository(db);
export const checkExecutionRepository = useMock ? ({} as any) : new DrizzleCheckExecutionRepository(db);
export const alarmRepository = useMock ? ({} as any) : new DrizzleAlarmRepository(db);
export const dashboardRepository = useMock ? ({} as any) : new DrizzleDashboardRepository(db);
export const recipientListRepository = useMock ? ({} as any) : new DrizzleRecipientListRepository(db);
export const notificationRepository = useMock ? ({} as any) : new DrizzleNotificationRepository(db);
export const reportRepository = useMock ? ({} as any) : new DrizzleReportRepository(db);
export const reportTemplateRepository = useMock ? ({} as any) : new DrizzleReportTemplateRepository(db);
export const checkDataReader = useMock ? ({} as any) : new DrizzleCheckDataReader(db);
export const scheduleRepository = useMock ? ({} as any) : new DrizzleScheduleRepository(db);
export const authProfileRepository = useMock ? ({} as any) : new DrizzleAuthProfileRepository(db);

// 5. Inizializzazione Servizi di Dominio (solo se non mock)
const assertionEngine = useMock ? ({} as any) : new AssertionEngine();
const alarmPolicyEvaluator = useMock ? ({} as any) : new AlarmPolicyEvaluator();
const statusTransitionService = useMock ? ({} as any) : new StatusTransitionService();
const dashboardResolverService = useMock ? ({} as any) : new DashboardResolverService(dashboardRepository);
const httpProbeExecutor = useMock ? ({} as any) : new HttpProbeExecutor();
const hostProbeExecutor = useMock ? ({} as any) : new HostProbeExecutor();
const pingProbeExecutor = useMock ? ({} as any) : new PingProbeExecutor();
const heartbeatProbeExecutor = useMock ? ({} as any) : new HeartbeatProbeExecutor();

const executorRegistry = useMock ? ({} as any) : new MapProbeExecutorRegistry();
if (!useMock) {
  executorRegistry.register("HTTP", httpProbeExecutor);
  executorRegistry.register("HOST", hostProbeExecutor);
  executorRegistry.register("PING", pingProbeExecutor);
  executorRegistry.register("HEARTBEAT", heartbeatProbeExecutor);
}

const reportAggregationService = useMock ? ({} as any) : new ReportAggregationService();
const notificationRoutingService = useMock ? ({} as any) : new NotificationRoutingService(recipientListRepository);
const emailSender = useMock ? ({} as any) : new ResendEmailSender();
const slackSender = useMock ? ({} as any) : new SlackWebhookSender();

// 6. Inizializzazione Use Cases (solo se non mock)
export const createDashboardUseCase = useMock
  ? ({} as any)
  : new CreateDashboardUseCase(dashboardRepository, eventBus);

export const addMonitorToDashboardUseCase = useMock
  ? ({} as any)
  : new AddMonitorToDashboardUseCase(dashboardRepository, monitorRepository, eventBus);

export const createMonitorUseCase = useMock
  ? ({} as any)
  : new CreateMonitorUseCase(monitorRepository, eventBus);

export const configureMonitorUseCase = useMock
  ? ({} as any)
  : new ConfigureMonitorUseCase(monitorRepository, eventBus);

export const cloneMonitorUseCase = useMock
  ? ({} as any)
  : new CloneMonitorUseCase(monitorRepository, eventBus);

export const processHeartbeatUseCase = useMock
  ? ({} as any)
  : new ProcessHeartbeatUseCase(
      monitorRepository,
      checkExecutionRepository,
      eventBus,
      undefined,
      undefined,
      new NodeVmScriptEvaluator()
    );

export const authTokenManager = new AuthTokenManager(new InMemoryAuthTokenCache());

export const executeCheckUseCase = useMock
  ? ({} as any)
  : new ExecuteCheckUseCase(
      monitorRepository,
      checkExecutionRepository,
      executorRegistry,
      assertionEngine,
      eventBus,
      undefined,
      undefined,
      new NodeVmScriptEvaluator(),
      authProfileRepository,
      authTokenManager
    );

export const createAuthProfileUseCase = useMock
  ? ({} as any)
  : new CreateAuthProfileUseCase(authProfileRepository);

export const updateAuthProfileUseCase = useMock
  ? ({} as any)
  : new UpdateAuthProfileUseCase(authProfileRepository);

export const deleteAuthProfileUseCase = useMock
  ? ({} as any)
  : new DeleteAuthProfileUseCase(authProfileRepository);

export const cloneAuthProfileUseCase = useMock
  ? ({} as any)
  : new CloneAuthProfileUseCase(authProfileRepository);


export const resolveAlarmUseCase = useMock
  ? ({} as any)
  : new ResolveAlarmUseCase(alarmRepository, monitorRepository, eventBus);


export const configureDashboardReportsUseCase = useMock
  ? ({} as any)
  : new ConfigureDashboardReportsUseCase(dashboardRepository, eventBus);

export const registerScheduleUseCase = useMock
  ? ({} as any)
  : new RegisterScheduleUseCase(scheduleRepository, schedulerGateway);

export const pauseScheduleUseCase = useMock
  ? ({} as any)
  : new PauseScheduleUseCase(scheduleRepository, schedulerGateway);

export const resumeScheduleUseCase = useMock
  ? ({} as any)
  : new ResumeScheduleUseCase(scheduleRepository, schedulerGateway);

export const generateReportUseCase = useMock
  ? ({} as any)
  : new GenerateReportUseCase(reportRepository, checkDataReader, reportAggregationService);

export const editReportUseCase = useMock ? ({} as any) : new EditReportUseCase(reportRepository);
export const confirmReportUseCase = useMock
  ? ({} as any)
  : new ConfirmReportUseCase(reportRepository, eventBus);

export const deliverNotificationUseCase = useMock
  ? ({} as any)
  : new DeliverNotificationUseCase(
      notificationRoutingService,
      notificationRepository,
      emailSender,
      slackSender,
      eventBus
    );

// 7. Registrazione Event Handler (solo se non mock)
if (!useMock) {
  const onMonitorConfigured = new OnMonitorConfigured(registerScheduleUseCase);
  const onMonitorStatusChangedScheduling = new OnMonitorStatusChangedScheduling(pauseScheduleUseCase, resumeScheduleUseCase);
  const onDashboardReportConfigured = new OnDashboardReportConfigured(registerScheduleUseCase, pauseScheduleUseCase);
  const onReportScheduleTriggered = new OnReportScheduleTriggered(generateReportUseCase);
  const onReportConfirmed = new OnReportConfirmed(deliverNotificationUseCase);
  const onNotificationDelivered = new OnNotificationDelivered(reportRepository);

  const onCheckExecuted = new OnCheckExecuted(
    alarmRepository,
    monitorRepository,
    alarmPolicyEvaluator,
    dashboardResolverService,
    eventBus
  );
  const onMonitorStatusChanged = new OnMonitorStatusChanged(
    alarmRepository,
    monitorRepository,
    eventBus
  );
  const onMonitorDataHealthChanged = new OnMonitorDataHealthChanged(
    alarmRepository,
    monitorRepository,
    eventBus
  );
  const onAlarmRaised = new OnAlarmRaised(
    alarmRepository,
    monitorRepository,
    alarmPolicyEvaluator,
    dashboardResolverService,
    eventBus
  );
  const onAlarmConfirmed = new OnAlarmConfirmed(deliverNotificationUseCase);
  const onAlarmResolved = new OnAlarmResolved(
    dashboardResolverService,
    deliverNotificationUseCase
  );
  const onDataAlertTriggered = new OnDataAlertTriggered();

  // Sottoscrizioni
  if ((globalRef as any).listenersRegistered !== true) {
    eventBus.subscribe("MonitorConfigured", (event) => onMonitorConfigured.handle(event));
    eventBus.subscribe("MonitorStatusChanged", (event) => onMonitorStatusChangedScheduling.handle(event));
    eventBus.subscribe("DashboardReportConfigured", (event) => onDashboardReportConfigured.handle(event));
    eventBus.subscribe("ReportScheduleTriggered", (event) => onReportScheduleTriggered.handle(event));
    eventBus.subscribe("ReportConfirmed", (event) => onReportConfirmed.handle(event));
    eventBus.subscribe("NotificationDelivered", (event) => onNotificationDelivered.handle(event));

    eventBus.subscribe("CheckExecuted", (event) => onCheckExecuted.handle(event));
    eventBus.subscribe("MonitorStatusChanged", (event) => onMonitorStatusChanged.handle(event));
    eventBus.subscribe("MonitorDataHealthChanged", (event) => onMonitorDataHealthChanged.handle(event));
    eventBus.subscribe("AlarmRaised", (event) => onAlarmRaised.handle(event));
    eventBus.subscribe("AlarmConfirmed", (event) => onAlarmConfirmed.handle(event));
    eventBus.subscribe("AlarmResolved", (event) => onAlarmResolved.handle(event));
    eventBus.subscribe("DataAlertTriggered", (event) => onDataAlertTriggered.handle(event));

    (globalRef as any).listenersRegistered = true;
  }
}
