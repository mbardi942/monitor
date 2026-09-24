import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import { Redis } from "ioredis";
import { Worker } from "bullmq";

import * as schema from "@monitor/db";
import { InMemoryEventBus } from "@monitor/event-bus";
import {
  DrizzleMonitorRepository,
  DrizzleCheckExecutionRepository,
  DrizzleAlarmRepository,
  DrizzleDashboardRepository,
  ExecuteCheckUseCase,
  AssertionEngine,
  AlarmPolicyEvaluator,
  StatusTransitionService,
  DashboardResolverService,
  HttpProbeExecutor,
  HostProbeExecutor,
  PingProbeExecutor,
  HeartbeatProbeExecutor,
  MapProbeExecutorRegistry,

  OnCheckExecuted,
  OnMonitorStatusChanged,
  OnMonitorDataHealthChanged,
  OnAlarmRaised,
  OnDataAlertTriggered,
  NodeVmScriptEvaluator,
  DrizzleAuthProfileRepository,
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

// Carica variabili d'ambiente (.env)
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:5432/apimonitor";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

console.log("[Worker] Starting bootstrap...");

// 1. Inizializzazione Database
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// 2. Inizializzazione Redis
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ richiede questa opzione impostata a null
});

redis.on("connect", () => console.log("[Worker] Connected to Redis."));
redis.on("error", (err) => console.error("[Worker] Redis connection error:", err));

// 3. Inizializzazione Event Bus (in-process per l'MVP)
const eventBus = new InMemoryEventBus();

// 4. Inizializzazione Repository e Servizi di Monitoring
const monitorRepository = new DrizzleMonitorRepository(db as any);
const checkExecutionRepository = new DrizzleCheckExecutionRepository(db as any);
const alarmRepository = new DrizzleAlarmRepository(db as any);
const dashboardRepository = new DrizzleDashboardRepository(db as any);

const assertionEngine = new AssertionEngine();
const alarmPolicyEvaluator = new AlarmPolicyEvaluator();
const statusTransitionService = new StatusTransitionService();
const dashboardResolverService = new DashboardResolverService(dashboardRepository);

// Registrazione degli esecutori delle sonde
const executorRegistry = new MapProbeExecutorRegistry();
executorRegistry.register("HTTP", new HttpProbeExecutor());
executorRegistry.register("HOST", new HostProbeExecutor());
executorRegistry.register("PING", new PingProbeExecutor());
executorRegistry.register("HEARTBEAT", new HeartbeatProbeExecutor());


const scriptEvaluator = new NodeVmScriptEvaluator();
const authProfileRepository = new DrizzleAuthProfileRepository(db as any);
const authTokenManager = new AuthTokenManager(new InMemoryAuthTokenCache());

// Use case principale del worker
const executeCheckUseCase = new ExecuteCheckUseCase(
  monitorRepository,
  checkExecutionRepository,
  executorRegistry,
  assertionEngine,
  eventBus,
  undefined,
  undefined,
  scriptEvaluator,
  authProfileRepository,
  authTokenManager
);

// 4b. Inizializzazione Repository e Servizi di Notification
const recipientListRepository = new DrizzleRecipientListRepository(db as any);
const notificationRepository = new DrizzleNotificationRepository(db as any);

const emailSender = new ResendEmailSender();
const slackSender = new SlackWebhookSender();

const notificationRoutingService = new NotificationRoutingService(recipientListRepository);
const deliverNotificationUseCase = new DeliverNotificationUseCase(
  notificationRoutingService,
  notificationRepository,
  emailSender,
  slackSender,
  eventBus
);

// 4c. Inizializzazione Repository e Servizi di Reporting
const reportRepository = new DrizzleReportRepository(db as any);
const reportTemplateRepository = new DrizzleReportTemplateRepository(db as any);
const checkDataReader = new DrizzleCheckDataReader(db as any);

const reportAggregationService = new ReportAggregationService();

const generateReportUseCase = new GenerateReportUseCase(
  reportRepository,
  checkDataReader,
  reportAggregationService
);
const editReportUseCase = new EditReportUseCase(reportRepository);
const confirmReportUseCase = new ConfirmReportUseCase(reportRepository, eventBus);

// 4d. Inizializzazione Repository e Servizi di Scheduling
const scheduleRepository = new DrizzleScheduleRepository(db as any);
const schedulerGateway = new BullMQSchedulerGateway(redis);

const registerScheduleUseCase = new RegisterScheduleUseCase(scheduleRepository, schedulerGateway);
const pauseScheduleUseCase = new PauseScheduleUseCase(scheduleRepository, schedulerGateway);
const resumeScheduleUseCase = new ResumeScheduleUseCase(scheduleRepository, schedulerGateway);


// 5. Registrazione degli Event Handler del Monitoring Context sull'Event Bus
// Gli handler gestiscono la consistenza eventuale degli allarmi (OPEN -> CONFIRMED, etc.)
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

eventBus.subscribe("CheckExecuted", (event) => onCheckExecuted.handle(event));
eventBus.subscribe("MonitorStatusChanged", (event) => onMonitorStatusChanged.handle(event));
eventBus.subscribe("MonitorDataHealthChanged", (event) => onMonitorDataHealthChanged.handle(event));
eventBus.subscribe("AlarmRaised", (event) => onAlarmRaised.handle(event));
eventBus.subscribe("AlarmConfirmed", (event) => onAlarmConfirmed.handle(event));
eventBus.subscribe("AlarmResolved", (event) => onAlarmResolved.handle(event));
eventBus.subscribe("DataAlertTriggered", (event) => onDataAlertTriggered.handle(event));

// Nuovi Handler
const onMonitorConfigured = new OnMonitorConfigured(registerScheduleUseCase);
const onMonitorStatusChangedScheduling = new OnMonitorStatusChangedScheduling(pauseScheduleUseCase, resumeScheduleUseCase);
const onDashboardReportConfigured = new OnDashboardReportConfigured(registerScheduleUseCase, pauseScheduleUseCase);
const onReportScheduleTriggered = new OnReportScheduleTriggered(generateReportUseCase);
const onReportConfirmed = new OnReportConfirmed(deliverNotificationUseCase);
const onNotificationDelivered = new OnNotificationDelivered(reportRepository);

eventBus.subscribe("MonitorConfigured", (event) => onMonitorConfigured.handle(event));
eventBus.subscribe("MonitorStatusChanged", (event) => onMonitorStatusChangedScheduling.handle(event));
eventBus.subscribe("DashboardReportConfigured", (event) => onDashboardReportConfigured.handle(event));
eventBus.subscribe("ReportScheduleTriggered", (event) => onReportScheduleTriggered.handle(event));
eventBus.subscribe("ReportConfirmed", (event) => onReportConfirmed.handle(event));
eventBus.subscribe("NotificationDelivered", (event) => onNotificationDelivered.handle(event));

// Aggiungiamo un log per il debug degli eventi
eventBus.subscribe("CheckExecuted", (event) => {
  console.log(`[Worker] Event: CheckExecuted - Monitor: ${event.monitorId} - Status: ${event.status}`);
});
eventBus.subscribe("MonitorStatusChanged", (event) => {
  console.log(`[Worker] Event: MonitorStatusChanged - Monitor: ${event.monitorId} - ${event.oldStatus} -> ${event.newStatus}`);
});
eventBus.subscribe("MonitorDataHealthChanged", (event) => {
  console.log(`[Worker] Event: MonitorDataHealthChanged - Monitor: ${event.monitorId} - ${event.oldStatus} -> ${event.newStatus}`);
});
eventBus.subscribe("AlarmRaised", (event) => {
  console.log(`[Worker] Event: AlarmRaised - AlarmId: ${event.alarmId} - Monitor: ${event.monitorId}`);
});
eventBus.subscribe("AlarmConfirmed", (event) => {
  console.log(`[Worker] Event: AlarmConfirmed - AlarmId: ${event.alarmId} - Monitor: ${event.monitorName}`);
});
eventBus.subscribe("AlarmResolved", (event) => {
  console.log(`[Worker] Event: AlarmResolved - AlarmId: ${event.alarmId} - Monitor: ${event.monitorName}`);
});

eventBus.subscribe("DashboardReportConfigured", (event) => {
  console.log(`[Worker] Event: DashboardReportConfigured - Dashboard: ${event.dashboardId} - Enabled: ${event.isEnabled}`);
});
eventBus.subscribe("ReportScheduleTriggered", (event) => {
  console.log(`[Worker] Event: ReportScheduleTriggered - Dashboard: ${event.dashboardId} - ScheduledAt: ${event.scheduledAt}`);
});
eventBus.subscribe("ReportConfirmed", (event) => {
  console.log(`[Worker] Event: ReportConfirmed - ReportId: ${event.reportId} - Dashboard: ${event.dashboardId}`);
});
eventBus.subscribe("NotificationDelivered", (event) => {
  console.log(`[Worker] Event: NotificationDelivered - NotificationId: ${event.notificationId} - Source: ${event.sourceId}`);
});

// 6. Inizializzazione BullMQ Worker per elaborare i check pianificati
const worker = new Worker(
  "monitor-checks",
  async (job) => {
    const { targetId } = job.data;
    console.log(`[Worker] Processing check job for monitor ${targetId} (Job: ${job.id})`);

    try {
      const result = await executeCheckUseCase.execute({ monitorId: targetId });
      if (result) {
        console.log(`[Worker] Check executed successfully for monitor ${targetId}. Status: ${result.status}`);
      } else {
        console.log(`[Worker] Check skipped for monitor ${targetId} (Monitor might be PAUSED)`);
      }
    } catch (error) {
      console.error(`[Worker] Error executing check for monitor ${targetId}:`, error);
      throw error; // Rilanciamo l'errore per far fallire il job in BullMQ
    }
  },
  {
    connection: redis as any,
    concurrency: 10, // Elaboriamo fino a 10 check in contemporanea
  }
);

worker.on("active", (job) => {
  console.log(`[Worker] Job ${job.id} started.`);
});

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});

// 6b. Inizializzazione BullMQ Worker per elaborare la generazione dei report
const reportWorker = new Worker(
  "report-generations",
  async (job) => {
    const { targetId } = job.data; // targetId rappresenta il dashboardId
    console.log(`[Worker] Processing report generation for dashboard ${targetId} (Job: ${job.id})`);

    try {
      // Emettiamo un evento fittizio per simulare l'evento di trigger (oppure chiamiamo direttamente il caso d'uso)
      await eventBus.publish({
        eventId: crypto.randomUUID(),
        occurredOn: new Date(),
        eventType: "ReportScheduleTriggered",
        dashboardId: targetId,
        scheduledAt: new Date(),
      } as any);

      console.log(`[Worker] Report generation event published for dashboard ${targetId}`);
    } catch (error) {
      console.error(`[Worker] Error starting report generation for dashboard ${targetId}:`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);

reportWorker.on("active", (job) => {
  console.log(`[Worker] Report Job ${job.id} started.`);
});

reportWorker.on("completed", (job) => {
  console.log(`[Worker] Report Job ${job.id} completed.`);
});

reportWorker.on("failed", (job, err) => {
  console.error(`[Worker] Report Job ${job?.id} failed:`, err);
});

console.log("[Worker] Bootstrap complete. Waiting for checks and report jobs...");

// Gestione corretta dello shutdown per rilasciare le connessioni
const graceShutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}. Closing connections...`);
  await worker.close();
  await reportWorker.close();
  await schedulerGateway.close();
  await redis.quit();
  await pool.end();
  console.log("[Worker] Shutdown complete.");
  process.exit(0);
};

process.on("SIGINT", () => graceShutdown("SIGINT"));
process.on("SIGTERM", () => graceShutdown("SIGTERM"));

