# Domain Model Reference — SaaS API Monitor & Observability Platform
## Formal Domain-Driven Design (DDD) Specification

> **Purpose**: This document provides the formal domain model specification for the application, aligned directly with the production TypeScript implementation in the monorepo.
> It defines the ubiquitous language, Bounded Contexts, Aggregates, Value Objects, Domain Events, Domain Services, and architectural Ports of the system.

---

## 1. Ubiquitous Language

These terms constitute the shared vocabulary of the domain and are rigorously used across documentation, architecture, and source code.

| Term | Definition |
|---|---|
| **Single-Tenant** | Architectural operational model: private or on-premise installation for a single engineering team. The system operates with a static tenant identity (`tenantId: "default-tenant"`), eliminating multi-tenant overhead or tiered billing complexity. |
| **Dashboard** | Operational workspace grouping a logical set of Monitors and establishing default configuration parameters for SLA status reporting. |
| **Monitor** | Central Aggregate Root modeling a recurring probe executed against an endpoint, service, or server. It encapsulates probe type, network parameters, scheduling, assertion rules, alarm policies, and notification recipients (`recipientIds`). |
| **MonitorType** | Polymorphic classification of the execution probe: `HTTP`, `PING`, `HOST`, `HEARTBEAT`. |
| **ProbeConfiguration** | Value Object containing operational parameters tailored to the probe type (URL, headers, body, TCP port, host agent URL, heartbeat token, timeout). |
| **AuthProfile** | Protected profile stored in the Credential Vault containing AES-256-GCM encrypted secrets used to authenticate HTTP probe requests. |
| **AuthProfileType** | Supported authentication mechanism: `BEARER`, `API_KEY`, `BASIC_AUTH`, `CUSTOM_HEADERS`, `OAUTH2_CLIENT_CREDENTIALS`, `DYNAMIC_LOGIN`. |
| **CryptoVault** | Cryptographic domain service responsible for AES-256-GCM symmetric encryption and decryption of sensitive credentials. |
| **DataExtractor** | Value Object defining rules to extract structured properties from JSON response payloads (`SINGLE_VALUE`, `TABLE`, `KEY_VALUE_PAIRS`) with visual hints (`DisplayHint`). |
| **MetricRule** | Evaluation rule applied to extracted data (comparison operators, aggregation functions `SUM`, `AVG`, `COUNT`, or custom JavaScript assertion scripts). |
| **DataHealthStatus** | Qualitative health status of data extracted from a monitor: `OK`, `WARNING`, `CRITICAL`, `NONE`. |
| **AlarmType** | Classification of triggered incidents: `AVAILABILITY` (reachability/uptime failure) or `DATA_METRIC` (violation of business data extraction rules). |
| **Schedule** | Unified scheduling Aggregate Root (`targetType: "MONITOR" \| "REPORT"`) orchestrated via BullMQ queues and configured with cron expressions or fixed second intervals. |
| **AssertionRule** | Declarative rule or sandboxed script validating the outcome of an HTTP probe (status code, response time SLA, regex, or custom JS logic). |
| **AlarmPolicy** | Confirmation criteria for availability incidents: consecutive failure count threshold (`consecutiveFailures`) or persistence duration (`persistenceDuration`). |
| **MonitorStatus** | Availability state of a Monitor: `UP`, `DOWN`, `DEGRADED`, `PENDING`, `PAUSED`. |
| **CheckExecution** | Immutable Entity tracking the historical result of a single probe execution at a specific timestamp (latency, outcome, extracted metrics, assertions). |
| **Alarm** | Aggregate Root tracking an incident detected on a monitor, driven by an explicit finite state machine: `OPEN` → `CONFIRMED` → `NOTIFIED` → `RESOLVED` (and `ESCALATED`). |
| **Severity** | Severity level of an incident: `INFO`, `WARNING`, `CRITICAL`. |
| **Report** | Consolidated document snapshotting availability, SLA metrics, and extracted data for a dashboard across a specified time window. |
| **RecipientList** | Collection of notification recipients configured for a dashboard. |
| **Recipient** | Contact entity configured with one or more physical notification channels. |
| **NotificationChannel** | Outbound transmission channel for alerts: `EMAIL`, `SLACK`, `WEBHOOK`. |
| **Notification** | Individual dispatched alert message tracking delivery attempts (`DeliveryAttempt`). |

---

## 2. Bounded Contexts

The system is organized into autonomous, decoupled Bounded Contexts:

```
┌────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME APPLICATIONS                         │
│   apps/web (Next.js 16 + Hono RPC)   │   apps/worker (BullMQ Worker)   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────────────────────▼───────────────────┐
│                             BOUNDED CONTEXTS                           │
│                                                                        │
│   ┌─────────────────────┐                 ┌───────────────────────┐    │
│   │     Monitoring      │◄─ScheduleTrig.──┤      Scheduling       │    │
│   │   (Core Domain)     │                 │     (Supporting)      │    │
│   └──────────┬──────────┘                 └───────────────────────┘    │
│              │                                                         │
│     CheckExecuted / AlarmConfirmed / DataAlertTriggered                │
│              │                                                         │
│              ├────────────────────────────────────┐                    │
│              ▼                                    ▼                    │
│   ┌─────────────────────┐                 ┌───────────────────────┐    │
│   │      Reporting      │─ReportConfirmed►│     Notification      │    │
│   │     (Supporting)    │                 │     (Supporting)      │    │
│   └─────────────────────┘                 └───────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Context Classification

| Bounded Context | Type | Domain Responsibilities |
|---|---|---|
| **Monitoring** | Core Domain | Probe execution, polymorphic probe lifecycle, assertion engine, data extractors, metric rules, Credential Vault, monitor state transitions, and alarm state machines. |
| **Scheduling** | Supporting | Time-based scheduling and orchestration of recurring checks and periodic reports using BullMQ queues backed by Redis. |
| **Notification** | Supporting | Recipient resolution for monitors and dashboards, multi-channel dispatching (Email, Slack, Webhooks), and delivery retry tracking. |
| **Reporting** | Supporting | Time-series data aggregation, SLA percentile calculations (P50, P95, P99), uptime availability analytics, and consolidated report generation. |

### 2.2 Infrastructure Support & Single-Tenant Architecture

- **`@monitor/shared-kernel`**: Shared library containing foundational DDD contracts (`AggregateRoot`, `Entity`, `ValueObject`, `Identifier`, `DomainEvent`, `EventBus` interface).
- **`@monitor/db`**: Relational Drizzle ORM schemas, PostgreSQL client factories, and versioned migrations.
- **`@monitor/event-bus`**: In-memory domain event bus providing asynchronous decoupling between contexts.
- **Single-Tenant On-Premise Model**: The architecture deliberately avoids complex multi-tenant IAM partitions. All domain entities and database tables operate under a static default tenant (`tenantId: "default-tenant"`).

### 2.3 Context Map & Event Flow

| Upstream Context | Downstream Context | Integration Pattern | Domain Event Exchanged |
|---|---|---|---|
| **Scheduling** | **Monitoring** | Open Host Service | `ScheduleTriggered` (with `targetType: "MONITOR"`) |
| **Scheduling** | **Reporting** | Open Host Service | `ScheduleTriggered` (with `targetType: "REPORT"`) |
| **Monitoring** | **Notification** | OHS + ACL | `AlarmConfirmed`, `AlarmResolved`, `DataAlertTriggered` |
| **Monitoring** | **Reporting** | Open Host Service | `CheckExecuted` |
| **Reporting** | **Notification** | OHS + ACL | `ReportConfirmed` |

> **Architectural Invariant**: No Bounded Context ever invokes another context synchronously or imports another context's domain models. All cross-context communication occurs strictly through **Domain Events**.

---

## 3. Monitoring Context (Core Domain)

### 3.1 Aggregate Root: Dashboard

**Role**: Groups a logical collection of Monitors and defines default configuration preferences for generated reports.

#### Properties
| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `DashboardId` | Yes | Unique aggregate identity |
| `name` | `string` | Yes | Human-readable dashboard name |
| `description` | `string` | No | Optional operational description |
| `monitorIds` | `MonitorId[]` | Yes | Collection of associated monitor identifiers |
| `reportConfig` | `DashboardReportConfig` | No | Pre-configured reporting preferences |
| `createdAt` | `Date` | Yes | Creation timestamp |
| `updatedAt` | `Date` | Yes | Last modification timestamp |

#### Value Object: DashboardReportConfig
- `customHeaderText?: string`: Default custom header text for reports.
- `customFooterText?: string`: Default custom footer text for reports.
- `defaultTemplateId?: string`: Associated visual template identifier.

#### Emitted Domain Events
- `DashboardCreated`: Emitted when a new dashboard is created.
- `DashboardReportConfigured`: Emitted when reporting preferences are modified.
- `MonitorAddedToDashboard`: Emitted when a monitor is linked to the dashboard.

---

### 3.2 Aggregate Root: Monitor

**Role**: Models the target probe, validation rules, direct notification recipients, and data extraction schemas.

#### Properties
| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `MonitorId` | Yes | Unique monitor identifier |
| `name` | `string` | Yes | Mnemonic service or server name |
| `type` | `MonitorType` | Yes | Polymorphic probe classification (`HTTP`, `PING`, `HOST`, `HEARTBEAT`) |
| `status` | `MonitorStatus` | Yes | Availability state (`UP`, `DOWN`, `DEGRADED`, `PENDING`, `PAUSED`) |
| `dataHealthStatus` | `DataHealthStatus` | Yes | Qualitative extracted data health (`OK`, `WARNING`, `CRITICAL`, `NONE`) |
| `probeConfiguration` | `ProbeConfiguration` | Yes | Probe-specific execution parameters |
| `schedule` | `Schedule` (VO) | Yes | Execution recurrence rule (cron or fixed interval) |
| `assertionRules` | `AssertionRule[]` | Yes | Declarative rules and sandboxed VM validation scripts |
| `metricRules` | `MetricRule[]` | Yes | Rules evaluated against extracted data for business alerting |
| `alarmPolicy` | `AlarmPolicy` | Yes | Confirmation threshold (consecutive failures or persistence duration) |
| `recipientIds` | `string[]` | Yes | Direct notification recipient identifiers |
| `dataExtractor` | `DataExtractor` | No | Structured JSON extraction schema (scalar, tables, key-values) |
| `createdAt` | `Date` | Yes | Creation timestamp |
| `updatedAt` | `Date` | Yes | Last modification timestamp |

#### Value Object: MonitorType
- `HTTP`: Outbound request to web/REST endpoints with headers, body, auth vault, and assertions.
- `PING`: Network connectivity check via raw TCP socket handshake on a specified port.
- `HOST`: Server hardware telemetry (CPU, RAM, disk) via the companion Pulse Host Agent.
- `HEARTBEAT`: Passive reception of periodic push signals (dead man's switch) with grace window.

#### Value Object: ProbeConfiguration
Tailored parameters by `MonitorType`:
- For `HTTP`: `url`, `method` (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`), `headers`, `body`, `timeout`, `expectedStatusCode`, `authProfileId`.
- For `PING`: `host` (FQDN or IP address), `port` (e.g., 80, 443, 5432, 6379, 22), `timeout`.
- For `HOST`: `agentUrl` (e.g., `http://192.168.1.50:9500`), `agentToken` (Bearer token), `timeout`.
- For `HEARTBEAT`: `heartbeatToken`, `expectedIntervalSeconds`, `gracePeriodSeconds`.

#### Value Object: DataExtractor
Specifies rules for extracting metrics from JSON response payloads:
- `schema`:
  - `SINGLE_VALUE`: Extracts a single scalar value (`valuePath`, `label`, `unit`, `format`: `number`, `currency`, `percentage`, `text`).
  - `TABLE`: Extracts an array of records (`dataPath`, `columns`: `path`, `label`, `format`).
  - `KEY_VALUE_PAIRS`: Extracts key-value mappings (`pairs`: `path`, `label`, `format`).
- `displayHint`: UI rendering recommendation (`STATUS_BADGE`, `SINGLE_VALUE`, `TABLE`, `KEY_VALUE_LIST`, `SPARKLINE`).
- `maxRows`: Maximum rows retained in memory.
- `pageSize`: Pagination size for tabular displays.
- `retainHistory`: Boolean flag to preserve time-series records.

#### Value Object: MetricRule
Evaluates logical or numerical assertions over extracted properties:
- `property`: Field name within extracted data.
- `operator`: `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`, `CUSTOM_SCRIPT`.
- `value`: Threshold comparison value.
- `aggregation`: Optional mathematical aggregation function (`SUM`, `AVG`, `COUNT`, `NONE`).
- `script`: Custom JavaScript code executed when operator is `CUSTOM_SCRIPT`.

#### Value Object: DataHealthStatus
- `OK`: All metric rules satisfied.
- `WARNING`: One or more metrics breached preliminary warning thresholds.
- `CRITICAL`: Severe business metric violation (triggers `DataAlertTriggered`).
- `NONE`: No data extractors or metric rules configured.

#### Emitted Domain Events
- `MonitorCreated`: Emitted upon monitor creation.
- `MonitorConfigured`: Emitted when parameters or rules are reconfigured.
- `MonitorStatusChanged`: Emitted when availability state changes (e.g., UP → DOWN).
- `MonitorDataHealthChanged`: Emitted when data quality status changes (e.g., OK → CRITICAL).

---

### 3.3 Aggregate Root: AuthProfile (Credential Vault)

**Role**: Manages encrypted credentials for authenticated HTTP probes with defense-in-depth security.

#### Properties
| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `AuthProfileId` | Yes | Unique profile identifier |
| `name` | `string` | Yes | Profile name (e.g., "Stripe API Key", "Auth0 Production") |
| `type` | `AuthProfileType` | Yes | Authentication mechanism classification |
| `encryptedCredentials` | `string` | Yes | AES-256-GCM symmetrically encrypted JSON payload |
| `description` | `string` | No | Operational notes |
| `createdAt` | `Date` | Yes | Creation timestamp |
| `updatedAt` | `Date` | Yes | Last update timestamp |

#### AuthProfile Types (`AuthProfileType`)
1. `BEARER`: Static token injected into the `Authorization: Bearer <token>` header.
2. `API_KEY`: Static key passed via custom header (e.g., `X-API-Key`) or query parameter.
3. `BASIC_AUTH`: Base64-encoded HTTP Basic credentials (`username` and `password`).
4. `CUSTOM_HEADERS`: Key-value map of sensitive headers injected into requests.
5. `OAUTH2_CLIENT_CREDENTIALS`: M2M OAuth2 flow parameters (`tokenUrl`, `clientId`, `clientSecret`, `scope`), managed with automated pre-flight token caching and refresh by `AuthTokenManager`.
6. `DYNAMIC_LOGIN`: Application-layer pre-flight login request (`loginUrl`, JSON payload, JSON extraction path).

---

### 3.4 Aggregate Root: CheckExecution

**Role**: Immutable historical fact recording a single probe execution at a precise timestamp.

#### Properties
- `id`: `CheckExecutionId`
- `monitorId`: `MonitorId`
- `executedAt`: Completion timestamp
- `result`: `CheckResult` containing:
  - `status`: `UP`, `DOWN`, or `DEGRADED`
  - `responseTimeMs`: Round-trip or handshake latency
  - `httpStatusCode`: HTTP status code (for web probes)
  - `errorMessage`: Error description if failed
- `extractedData?`: Structured properties parsed from the response body
- `assertionResults`: Detailed evaluation results for each configured assertion rule

#### Emitted Domain Event
- `CheckExecuted`: Emitted after each completed check, consumed by the Reporting Context.

---

### 3.5 Aggregate Root: Alarm

**Role**: Models an active or resolved incident on a monitor, distinguishing between reachability issues (`AVAILABILITY`) and business payload violations (`DATA_METRIC`).

#### Properties
- `id`: `AlarmId`
- `monitorId`: `MonitorId`
- `alarmType`: `AVAILABILITY` \| `DATA_METRIC`
- `severity`: `INFO` \| `WARNING` \| `CRITICAL`
- `confirmationStatus`: `OPEN` \| `CONFIRMED` \| `NOTIFIED` \| `RESOLVED`
- `period`: `AlarmPeriod` (`openedAt`, `confirmedAt?`, `notifiedAt?`, `resolvedAt?`)
- `failureAccumulator`: Immutable counter tracking consecutive failures and initial failure timestamp
- `triggerCheckExecutionId`: Identifier of the execution that triggered the incident

#### Alarm State Machine
```
         [Failed Check]
                │
                ▼
          ┌───────────┐
          │   OPEN    │ ◄── Accumulates consecutive failures
          └─────┬─────┘
                │
                ├─────────────────────────────┐
        Threshold Exceeded              Service Restored
                ▼                             ▼
          ┌───────────┐                 ┌───────────┐
          │ CONFIRMED │                 │ RESOLVED  │ (False alarm,
          └─────┬─────┘                 └───────────┘  no alert sent)
                │
         Notification Sent
                ▼
          ┌───────────┐
          │ NOTIFIED  │
          └─────┬─────┘
                │
        Service Restored
                ▼
          ┌───────────┐
          │ RESOLVED  │ ──► (Dispatches Recovery notification if enabled)
          └───────────┘
```

#### Emitted Domain Events
- `AlarmRaised`: Opened upon the first check failure (`OPEN`).
- `AlarmConfirmed`: Policy threshold exceeded (`CONFIRMED`).
- `AlarmNotified`: Notification successfully delivered to external channels.
- `AlarmResolved`: Service recovered or incident manually resolved by operator (`RESOLVED`).
- `AlarmEscalated`: Incident severity escalated (e.g., WARNING → CRITICAL).
- `DataAlertTriggered`: Emitted immediately when extracted data violates a critical metric rule.

---

## 4. Scheduling Context (Supporting)

### 4.1 Unified Aggregate Root: Schedule

The scheduling context uses a unified aggregate managing both recurring monitor checks and periodic SLA report generation.

#### Properties
| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `ScheduleId` | Yes | Unique schedule identifier |
| `targetId` | `string` | Yes | Target entity identifier (MonitorId or DashboardId) |
| `targetType` | `"MONITOR" \| "REPORT"` | Yes | Execution target type |
| `cron` | `string \| null` | No | 5-field cron expression (e.g., `*/5 * * * *`) |
| `intervalSeconds` | `number \| null` | No | Fixed recurrence interval in seconds (minimum 10s) |
| `isActive` | `boolean` | Yes | Schedule activation status |
| `createdAt` | `Date` | Yes | Registration timestamp |
| `updatedAt` | `Date` | Yes | Last modification timestamp |

#### Invariants
- Exactly one of `cron` or `intervalSeconds` must be defined.
- When `intervalSeconds` is specified, it must be greater than or equal to 10 seconds.

#### Emitted Domain Event
- `ScheduleTriggered`: Emitted when a schedule tick fires, containing `{ scheduleId, targetId, targetType, scheduledAt }`.

---

## 5. Notification Context (Supporting)

### 5.1 Aggregate Root: RecipientList & Recipient Entity

**Role**: Manages notification contacts associated with dashboards or specific monitors.

#### RecipientList Properties
- `id`: `RecipientListId`
- `dashboardId`: `DashboardId`
- `recipients`: Collection of `Recipient` entities

#### Entity: Recipient
- `id`: `string`
- `name`: Contact or team name
- `channels`: Collection of `NotificationChannel` (`type: "EMAIL" | "SLACK" | "WEBHOOK"`, `address: string`)

---

### 5.2 Aggregate Root: Notification & DeliveryAttempt

**Role**: Models individual notification dispatches, recording target channels and delivery outcomes.

#### Properties
- `id`: `NotificationId`
- `type`: `ALARM` \| `RECOVERY` \| `DATA_ALERT` \| `REPORT`
- `recipientId`: Recipient identifier
- `channel`: `"EMAIL" | "SLACK" | "WEBHOOK"`
- `deliveryStatus`: `"PENDING" | "SENT" | "FAILED"`
- `attempts`: Collection of delivery retry records (`DeliveryAttempt`)

#### Emitted Domain Event
- `NotificationDelivered`: Emitted upon successful delivery to the physical transport channel.

---

### 5.3 Anti-Corruption Layer (ACL)

The Notification Context has zero direct coupling to the Monitoring or Reporting domain models. The ACL translates external domain events:
- `AlarmConfirmed` → Generates availability incident notification request with severity and monitor context.
- `AlarmResolved` → Evaluates recovery notification policies and generates recovery messages.
- `DataAlertTriggered` → Dispatches immediate qualitative data alerts.
- `ReportConfirmed` → Generates report distribution messages.

---

## 6. Reporting Context (Supporting)

### 6.1 Aggregate Root: Report

**Role**: Consolidated analytical document snapshotting the performance of a dashboard over a time window.

#### Properties
- `id`: `ReportId`
- `dashboardId`: Source dashboard identifier
- `isEditable`: Boolean flag indicating if notes can be amended prior to finalization
- `status`: `DRAFT` \| `CONFIRMED` \| `SENT`
- `period`: Time window (`from`, `to`)
- `content`: `ReportContent` containing uptime percentages, average response times, P95 percentiles, and per-monitor summaries
- `customText`: Custom notes, header, and footer text
- `createdAt`, `confirmedAt?`, `sentAt?`: Lifecycle timestamps

#### Emitted Domain Event
- `ReportConfirmed`: Emitted when an operator approves a report for final distribution.

---

## 7. Credential Vault & Cryptographic Architecture

### 7.1 Symmetric AES-256-GCM Encryption
Sensitive credentials stored in `AuthProfile` entities are encrypted at rest:
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode), guaranteeing both confidentiality and cryptographic data integrity.
- **Secret Key (`ENCRYPTION_KEY`)**: 64-character hexadecimal string (32 bytes / 256 bits) configured via environment variables.
- **Initialization Vector (IV)**: 12-byte cryptographically secure random buffer generated per encryption operation.
- **Authentication Tag**: 16-byte authentication tag ensuring payload tamper detection.
- **Storage Format**: Encoded as `iv:authTag:ciphertext` in Base64/Hex format.

### 7.2 Dynamic Token Management (`AuthTokenManager`)
For HTTP probes requiring OAuth2 or dynamic authentication:
- Performs pre-flight requests to the authentication endpoint prior to probe execution.
- Automatically refreshes Bearer tokens based on parsed TTL (Time-To-Live).
- Maintains an in-memory cache to prevent redundant token exchanges on every check tick.

---

## 8. Domain Events Catalog (17 Production Events)

Cross-context communication and system reactivity rely on **17 production domain events**:

### 8.1 Monitoring Context (14 Events)
1. **`MonitorCreated`**: New monitor registered in the system.
2. **`MonitorConfigured`**: Monitor parameters, probe settings, or rules modified.
3. **`MonitorStatusChanged`**: Monitor availability state transitioned (e.g., UP → DOWN).
4. **`MonitorDataHealthChanged`**: Extracted data quality transitioned (e.g., OK → CRITICAL).
5. **`MonitorAddedToDashboard`**: Monitor linked to a dashboard.
6. **`DashboardCreated`**: New dashboard created.
7. **`DashboardReportConfigured`**: Dashboard report settings updated.
8. **`CheckExecuted`**: Completed probe execution with latency and status results.
9. **`AlarmRaised`**: Initial incident opened on first failure (`OPEN`).
10. **`AlarmConfirmed`**: Alarm policy threshold reached (`CONFIRMED`).
11. **`AlarmNotified`**: Alert notification transmitted to outbound channels.
12. **`AlarmResolved`**: Monitor recovered or alarm manually resolved (`RESOLVED`).
13. **`AlarmEscalated`**: Alarm severity escalated (`ESCALATED`).
14. **`DataAlertTriggered`**: Critical violation of an extracted data metric rule.

### 8.2 Scheduling Context (1 Event)
15. **`ScheduleTriggered` (`MonitorScheduleTriggered` / `ReportScheduleTriggered`)**: Scheduled tick fired for probe execution or periodic report generation.

### 8.3 Reporting Context (1 Event)
16. **`ReportConfirmed`**: Finalized approval of an SLA availability report.

### 8.4 Notification Context (1 Event)
17. **`NotificationDelivered`**: Confirmed delivery to external channel (Email, Slack, Webhook).

---

## 9. Commands & Queries (CQRS)

### 9.1 Application Commands (Write Side)

#### Monitoring Context
- `CreateDashboard`: Creates a new dashboard workspace.
- `AddMonitorToDashboard`: Associates a monitor with a dashboard.
- `ConfigureDashboardReports`: Updates dashboard reporting preferences.
- `CreateMonitor`: Registers a new monitor with probe and alarm policies.
- `ConfigureMonitor`: Updates an existing monitor's parameters.
- `CloneMonitor`: Clones a monitor with identical configurations.
- `CreateAuthProfile`: Encrypts and stores a new profile in the Credential Vault.
- `UpdateAuthProfile`: Updates credentials and settings for an auth profile.
- `DeleteAuthProfile`: Removes a profile from the Credential Vault.
- `CloneAuthProfile`: Duplicates an existing auth profile.
- `ExecuteCheck`: Triggers an immediate ad-hoc probe execution.
- `ProcessHeartbeat`: Receives inbound ping signals for Heartbeat probes.
- `ResolveAlarm`: Manually clears an active incident.

#### Scheduling Context
- `RegisterSchedule`: Establishes recurring schedule rules (interval or cron).
- `PauseSchedule`: Suspends active scheduling.
- `ResumeSchedule`: Reactivates paused schedules.

#### Notification Context
- `DeliverNotification`: Dispatches notification messages across external channels.

#### Reporting Context
- `GenerateReport`: Initiates time-series aggregation for the chosen window.
- `ConfirmReport`: Approves and locks a report for delivery.

### 9.2 Read Model & Queries (Read Side)
Query handlers bypass aggregate hydration to return optimized projections:
- `GetDashboardList`: Dashboard summaries with high-level statistics.
- `GetDashboardOverview`: Aggregate fleet health metrics and monitor status counts.
- `GetMonitorDetail`: Comprehensive monitor state, check history, and latency graphs.
- `GetActiveAlarms`: Currently open or confirmed incidents.
- `GetAlarmHistory`: Historical incident log with resolution durations.
- `GetAuthProfiles`: List of Credential Vault profiles (without exposing secrets).
- `GetReportHistory`: Archive of finalized dashboard SLA reports.

---

## 10. Domain Services (10 Production Services)

Domain logic spanning multiple entities is encapsulated within **10 Domain Services**:

### Monitoring Context (8 Services)
1. **`AssertionEngine`**: Evaluates declarative assertion rules (status code, SLA latency, body regex) and delegates to `NodeVmScriptEvaluator` for sandboxed JavaScript scripts.
2. **`StatusTransitionService`**: Governs Monitor availability state transitions (`PENDING`, `UP`, `DOWN`, `DEGRADED`, `PAUSED`) and emits events upon state changes.
3. **`AlarmPolicyEvaluator`**: Compares `FailureAccumulator` state in `OPEN` alarms against the monitor's `AlarmPolicy` to determine incident confirmation.
4. **`DashboardResolverService`**: Resolves parent dashboards linked to a monitor to propagate operational context during incidents.
5. **`CryptoVault`**: Manages secure AES-256-GCM encryption and decryption of `AuthProfile` secrets.
6. **`AuthTokenManager`**: Orchestrates pre-flight login requests, token exchanges, and TTL-aware caching for authenticated probes.
7. **`DataExtractionService`**: Extracts structured JSON properties (scalars, tables, key-values) from HTTP response bodies.
8. **`MetricEvaluationEngine`**: Evaluates `MetricRule` assertions over extracted data, executes aggregations, and determines `DataHealthStatus`.

### Notification Context (1 Service)
9. **`NotificationRoutingService`**: Resolves direct recipient contacts (`recipientIds`) and dashboard contacts, filters active channels (`EMAIL`, `SLACK`, `WEBHOOK`), and builds delivery payloads.

### Reporting Context (1 Service)
10. **`ReportAggregationService`**: Aggregates historical `CheckExecution` records to calculate uptime percentages, success rates, average latency, and P50/P95 percentiles.

---

## 11. Repositories & Architectural Ports

The domain boundary communicates outward exclusively through typed Interfaces (Ports):

### 11.1 Persistence Ports (Repositories)
- `MonitorRepository`: Persistence and hydration of the Monitor aggregate root.
- `DashboardRepository`: Persistence of dashboards and monitor linkages.
- `CheckExecutionRepository`: Append-only storage and time-series queries for check records.
- `AlarmRepository`: Persistence and query interface for incident lifecycles.
- `AuthProfileRepository`: Encrypted storage for Credential Vault profiles.
- `ScheduleRepository`: State management for recurring BullMQ schedules.
- `RecipientListRepository`: Storage for notification recipient groups.
- `NotificationRepository`: Dispatch log tracking notifications and delivery attempts.
- `ReportRepository`: Storage and querying of consolidated SLA reports.

### 11.2 Special Service Ports
- `ProbeExecutor`: Interface for physical probe execution (`HttpProbeExecutor` with `NodeVmScriptEvaluator` sandbox, `PingProbeExecutor` with raw TCP sockets, `HostProbeExecutor`, `HeartbeatProbeExecutor`).
- `NotificationSender`: Outbound delivery interface (`ResendEmailSender`, `SlackWebhookSender`, `GenericWebhookSender`).
- `CheckDataReader`: Read-optimized port querying historical check metrics for reporting aggregation.

---

## 12. Integration Rules & Architectural Invariants

1. **Absolute Domain Purity**: Source files inside `packages/*/src/domain/` depend exclusively on `@monitor/shared-kernel`. They never import databases (Drizzle), frameworks (Next.js, Hono), or network libraries.
2. **Event-Driven Decoupling**: Bounded Contexts interact only through publishing and subscribing to Domain Events over the shared in-memory Event Bus.
3. **Idempotent Handlers**: All event consumers enforce idempotency to prevent duplicate dispatches or notifications upon queue retries.
4. **Gateway Pattern for Web UI**: The frontend interacts with backend services through Gateway ports, enabling instantaneous switching between in-memory mock adapters and production PostgreSQL/Redis infrastructure.

---

## 13. Numerical Summary of the Real Domain Model

| Domain Component | Count | Production Implementation Details |
|---|---|---|
| **Bounded Contexts** | **4** | `Monitoring` (Core), `Scheduling`, `Notification`, `Reporting` |
| **Primary Aggregates** | **9** | `Monitor`, `Dashboard`, `CheckExecution`, `Alarm`, `AuthProfile` (Monitoring); `Schedule` (Scheduling); `RecipientList`, `Notification` (Notification); `Report` (Reporting) |
| **Internal Entities** | **2** | `Recipient` (inside `RecipientList`), `DeliveryAttempt` (inside `Notification`) |
| **Supported Probes** | **4** | `HTTP`, `PING` (TCP Socket), `HOST` (Pulse Agent Telemetry), `HEARTBEAT` (Passive Push) |
| **Authentication Profiles** | **6** | `BEARER`, `API_KEY`, `BASIC_AUTH`, `CUSTOM_HEADERS`, `OAUTH2_CLIENT_CREDENTIALS`, `DYNAMIC_LOGIN` |
| **Notification Channels** | **3** | `EMAIL`, `SLACK`, `WEBHOOK` |
| **Domain Events** | **17** | 14 in Monitoring, 1 in Scheduling, 1 in Reporting, 1 in Notification |
| **Domain Services** | **10** | 8 in Monitoring, 1 in Notification, 1 in Reporting |
| **Repository Ports** | **9** | Typed persistence abstractions |
| **Special Service Ports** | **3** | `ProbeExecutor`, `NotificationSender`, `CheckDataReader` |
