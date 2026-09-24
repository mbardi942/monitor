# SaaS API Monitor

**An enterprise-grade platform for API uptime, performance monitoring, and server telemetry, designed with Domain-Driven Design (DDD), Hexagonal Architecture (Ports & Adapters), and a modern full-stack TypeScript ecosystem.**

[![CI](https://github.com/mbardi942/monitor/actions/workflows/ci.yml/badge.svg)](https://github.com/mbardi942/monitor/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo)](https://turbo.build/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

> [!NOTE]
> **Project Scope & Development Transparency**: This repository was built as an applied engineering study to explore **Next.js 16** (App Router, Server Actions, Server Components) and test the disciplined use of **AI Pair-Programming (Coding Agents)** in a realistic scenario. The system implements **Domain-Driven Design (DDD)** and **Hexagonal Architecture (Ports & Adapters)**, enforcing strict **TypeScript** typing, clean domain boundaries, and an end-to-end automated test suite.
>
> *Note on Documentation: This project's documentation was originally authored in Italian and translated/adapted into English with the assistance of AI tools. Architecture, system design, and implementation decisions remain human-guided and verifiable in the codebase.*

---

## Application Scope & Core Capabilities

**SaaS API Monitor** is a distributed synthetic monitoring and alerting system engineered to track heterogeneous probe types. It provides engineering teams with real-time observability, historical uptime reporting, and automated incident alerting across servers, web APIs, and background workloads.

The platform enables you to:
- **Monitor HTTP/S Endpoints**: scheduled execution of configurable probes (REST APIs, Webhooks, web microservices) with custom headers, query parameters, payloads, and granular timeouts.
- **Validate Responses with Flexible Assertion Rules**: automatic verification of HTTP status codes, maximum response latency (SLA thresholds), regex pattern matching against response payloads, and isolated JavaScript assertion scripts.
- **Inspect Port Connectivity (TCP Sockets)**: low-level handshake testing on dedicated TCP ports (databases, Redis caches, mail servers, internal microservices).
- **Collect Host Telemetry**: tracking of vital server hardware metrics (CPU load, RAM consumption, disk space) via an integrated companion agent: **Pulse Host Agent** (`monitor-probe-collector`).
- **Capture Passive Heartbeats (Push)**: dead-man's switch monitoring for background workers, asynchronous jobs, and external cron tasks.
- **Multi-Channel Alerting & State Lifecycle**: automatic state transitions (UP / DOWN / DEGRADED) with alarms that open on consecutive anomalies, auto-resolve upon service recovery, and notify teams via Email or Slack Webhooks.
- **Analyze Metrics & SLAs**: visualization of response time percentiles (P50, P95), uptime availability percentages, and historical latency distributions.
- **Generate Availability Reports**: structured dashboard reports with SLA trends, exportable for auditing or long-term operational records.

> [!NOTE]
> **Operating Model & Security Considerations**:
> The application is currently designed as a self-hosted, single-tenant appliance for internal development and operations teams. It deliberately omits public multi-tenant authentication in this stage. It is intended to run inside **private networks, corporate intranets, or behind a VPN / authenticated reverse proxy**, avoiding unauthenticated exposure to the public internet.

---

## Supported Monitoring Probes

The core monitoring engine natively supports four distinct probe executors:

### 1. HTTP / REST Probe (Endpoints & Web APIs)
Executes scheduled HTTP/HTTPS requests to verify service availability and semantic correctness:
- **Supported Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`.
- **Configurable Settings**: custom headers, body payload, execution interval, and per-request timeouts.
- **Credential Vault Integration**: connection to secure authentication profiles (Basic Auth, Bearer Tokens, OAuth2 Client Credentials with automatic pre-flight token caching and refresh).
- **Validation Engine**:
  - Declarative rules on status codes (e.g., `== 200`), maximum latency SLA, and regex/substring body matching.
  - Script VM Sandbox: execution of custom JavaScript validation scripts in an isolated Node.js VM context with hard execution timeouts.
- **Metric Extractors**: extraction of specific JSON fields from response payloads for dashboard widgets (single values, tables, key-value pairs, time-series).

### 2. PING / TCP Socket Probe (Network & Port Connectivity)
Performs low-level network handshake tests by opening a raw TCP socket towards the target host:
- **Configurable Settings**: target host (IP or FQDN), destination TCP port (e.g., 5432 for PostgreSQL, 6379 for Redis, 22 for SSH, 80/443), and connection timeout.
- **Observed Metrics**: exact socket handshake and round-trip latency; immediate failure detection on connection timeouts, connection refused, or unreachable networks.

### 3. HOST Telemetry Probe (Server Hardware Metrics)
Polls the companion **Pulse Host Agent** (`monitor-probe-collector`) running on remote host servers:
- **Configurable Settings**: agent URL (default port 9500), cryptographic authorization Bearer token (`AGENT_TOKEN`), and request timeout.
- **Observed Hardware Metrics**: CPU utilization percentage, total/used/free RAM memory, and mounted disk volume capacity.
- **Operational Value**: proactive alerting before infrastructure saturation causes downstream service outages.

### 4. HEARTBEAT Probe (Passive Job & Cron Monitoring)
Operates as an inverted monitoring mechanism (dead man's switch) for background scripts that cannot receive inbound network traffic:
- **Mechanism**: the platform generates a unique HTTP endpoint token that the external job pings upon completion (via cURL, Bash, Python, or Node.js).
- **Configurable Settings**:
  - `Expected Interval`: scheduled recurrence of the job (e.g., hourly, daily).
  - `Grace Period`: acceptable margin of delay before triggering an incident (e.g., 10 minutes).
- **Alerting**: if an expected heartbeat does not arrive within the combined window (`interval + grace`), the probe automatically enters a DOWN state and triggers alarms.

---

## Technology Stack

An overview of the core technologies across the monorepo:

| Area | Technologies | Application & Role |
|---|---|---|
| **Language & Typings** | TypeScript 5.x | Strict end-to-end static typing and explicit domain model contracts |
| **Frontend & Web Layer** | Next.js 16 (App Router), Tailwind CSS, Lucide Icons, Recharts | Server Components, Server Actions, responsive dashboard, and real-time charts |
| **API & RPC Communication** | Hono RPC | Type-safe shared client and lightweight REST API handlers |
| **Asynchronous Processing** | BullMQ & Redis | Dedicated background worker, resilient job queues, retries, and scheduling |
| **Data Persistence** | PostgreSQL, Drizzle ORM | Type-safe relational schema, versioned migrations, and high-performance queries |
| **Security & Cryptography** | Web Crypto / Node Crypto (AES-256-GCM) | Symmetric encryption for credentials and tokens stored in the Vault |
| **Monorepo & Build Tool** | Turborepo, pnpm | Modular package architecture, cached task execution, and workspace management |
| **Testing** | Vitest | Fast unit, integration, assertion engine, VM sandbox, and UI component tests |

---

## Architecture & Design Decisions

- **Domain-Driven Design (DDD)**: pure core domain modeled around Aggregate Roots (`Monitor`, `Alarm`, `CheckExecution`), immutable Value Objects, Domain Events, and isolated Bounded Contexts.
- **Hexagonal Architecture (Ports & Adapters)**: strict separation of business logic from infrastructure. The core domain contains zero dependencies on databases or web frameworks.
- **Modular Monorepo**: partitioned with Turborepo and pnpm into 7 independent packages (`monitoring`, `scheduling`, `notification`, `reporting`, `shared-kernel`, `db`, `event-bus`) and 2 distinct applications (`apps/web`, `apps/worker`).
- **Decoupled Background Worker**: probe execution is offloaded to an independent worker process running BullMQ on Redis, ensuring the Next.js web application is never blocked by probe I/O.
- **Dual Gateway Mode (Mock & Real)**: instant switching via `NEXT_PUBLIC_USE_MOCK` between an in-memory mock gateway (zero dependencies) and the real production gateway (PostgreSQL + Redis).
- **Credential Vault & Auth Profiles**: AES-256-GCM encrypted storage for sensitive API keys, Basic Auth credentials, and OAuth2 Client Credentials with automatic pre-flight token refresh.
- **Automated Test Coverage**: over 95 automated tests passing with Vitest across domain models, use cases, assertion engines, VM sandbox security, and React UI components.

---

## Interface Preview & Screenshots

### 1. Main Dashboard & Fleet Overview
High-level operational overview of all configured monitors with aggregate health metrics (Global Uptime, Average Latency, Active Alarms, UP/DOWN status counts) and responsive grid views.

![Dashboard Overview](docs/screenshots/dashboard_overview.png)

---

### 2. Compact View / Monitor List
High-density table view showing response times, availability percentages, and quick actions (pause, instant manual re-check, clone).

![Monitors List](docs/screenshots/monitors_list.png)

---

### 3. Monitor Detail, SLA Metrics & Diagnostics
Dedicated inspection screen for individual monitors, displaying latency percentiles (P50, P95), success rates, extracted metric timelines, and incident history.

![Monitor Detail](docs/screenshots/monitor_detail.png)

#### Execution History & Incident Logs
Detailed log of recent executions, response headers, status codes, and automatic alarm state resolution cycles.

![Monitor Detail History](docs/screenshots/monitor_detail2.png)

---

### 4. Advanced Probe Configuration & Credential Vault
Tabbed configuration modal for target settings (HTTP/HTTPS, TCP Socket, Heartbeat push), timeouts, schedules, and association with encrypted Vault profiles.

![Monitor Form](docs/screenshots/monitor_form.png)

---

### 5. Uptime & SLA Report Generator
Comprehensive reporting interface with SLA availability trends, P95/P99 latency analysis, selective monitor inclusion, and custom operational notes.

![Reports View](docs/screenshots/reports_view.png)

---

## System Architecture

The application is structured into autonomous Bounded Contexts that communicate exclusively via Domain Events:

```mermaid
graph TB
    subgraph "apps/"
        WEB["apps/web<br/>Next.js 16 + Hono RPC<br/>Server Actions + Mock/Real Gateways"]
        WORKER["apps/worker<br/>BullMQ Background Worker<br/>Asynchronous Probe Execution Engine"]
    end

    subgraph "packages/ — Bounded Contexts"
        direction TB
        SK["@monitor/shared-kernel<br/>AggregateRoot, Entity, ValueObject<br/>Base Domain Abstractions"]
        MON["@monitor/monitoring<br/>Core Domain<br/>Monitor · Alarm · CheckExecution<br/>Assertion Engine · HTTP / TCP / Host Probes"]
        SCH["@monitor/scheduling<br/>Scheduling Context<br/>Cron & Interval Dispatcher"]
        NOT["@monitor/notification<br/>Notification Context<br/>Email (Resend) · Slack Webhooks"]
        REP["@monitor/reporting<br/>Reporting Context<br/>Uptime · SLA · Latency Percentiles"]
        DB["@monitor/db<br/>Drizzle ORM + PostgreSQL<br/>Relational Schema · Migrations"]
        EB["@monitor/event-bus<br/>In-Memory Domain Event Bus<br/>AlarmTriggered · AlarmResolved"]
    end

    WEB -->|"Server Actions / Hono RPC"| MON
    WEB -->|"Query"| REP
    WEB -->|"Read / Write"| DB
    WORKER -->|"Process Queues"| MON
    WORKER -->|"Schedule"| SCH
    WORKER -->|"Publish Events"| EB
    EB -->|"Subscribe"| NOT
    EB -->|"Subscribe"| REP
    MON --> SK
    SCH --> SK
    NOT --> SK
    REP --> SK
```

### Monitoring & Alerting Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as Scheduling Context
    participant Worker as Background Worker
    participant Domain as Monitoring Domain
    participant DB as Database (Drizzle)
    participant Bus as Domain Event Bus
    participant Notify as Notification Context

    Scheduler->>Worker: Enqueue Check Job (BullMQ)
    Worker->>Domain: ExecuteCheckUseCase.execute()
    Domain->>Domain: Execute Probe & Evaluate Assertions
    Domain->>DB: Persist CheckExecution & Update Uptime Stats
    alt Assertions Failed — Incident Triggered
        Domain->>Bus: Publish AlarmTriggeredEvent
        Bus->>Notify: Dispatch to event handlers
        Notify->>Notify: Resolve channels & Send Email / Slack
    else Health Restored — Incident Resolved
        Domain->>Bus: Publish AlarmResolvedEvent
        Bus->>Notify: Send Recovery Notification
    end
```

---

## Operating Guide & Installation

### System Prerequisites

- **Node.js** (`18.0.0` or higher; Node 20 LTS recommended)
- **pnpm** (`9.1.0` or higher, required for Turborepo workspace management)
- **Docker & Docker Compose** (required only when running real PostgreSQL and Redis services)

---

### Operating Modes

The system supports two execution modes enabled by the Gateway Pattern:

1. **Mock Mode (Standalone — Zero External Dependencies)**:
   - Ideal for UI development, demos, and rapid testing without installing Docker, Postgres, or Redis.
   - Utilizes in-memory mock gateways with rich synthetic datasets and realistic historical metrics.
   - Enabled by default: `NEXT_PUBLIC_USE_MOCK=true`.

2. **Real Mode (Production & Integrated Testing)**:
   - Executes live network checks (HTTP, TCP Sockets, Host Agent telemetry, Heartbeats).
   - Persists all execution records, alarms, and reports into PostgreSQL via Drizzle ORM.
   - Dispatches scheduled checks across distributed BullMQ queues on Redis.
   - Enabled by setting: `NEXT_PUBLIC_USE_MOCK=false`.


---

### Local Development Quick Start

#### Generating a Secure `ENCRYPTION_KEY`
The Credential Vault requires a 64-character hexadecimal string (32 bytes for AES-256-GCM symmetric encryption). Generate one using any of these commands:
- **Node.js (Cross-platform)**:
  ```bash
  node -e "console.log(crypto.randomBytes(32).toString('hex'))"
  ```
- **Linux / macOS / Git Bash**:
  ```bash
  openssl rand -hex 32
  ```
- **Windows PowerShell**:
  ```powershell
  powershell -Command "[BitConverter]::ToString((New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes((New-Object byte[] 32))).Replace('-','').ToLower()"
  ```


#### Option A — Mock Mode (In-Memory, Zero Infrastructure)

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/mbardi942/monitor.git
cd monitor
pnpm install

# 2. Configure environment (Mock mode is enabled by default)
cp .env.example apps/web/.env.local

# 3. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application is immediately navigable with in-memory data.

> *Note for Windows Users:* If you encounter PowerShell script execution policy errors, run commands with:
> ```powershell
> powershell -ExecutionPolicy Bypass -Command "pnpm dev"
> ```

---

#### Option B — Real Mode (PostgreSQL + Redis with Docker)

In this scenario, PostgreSQL and Redis run inside Docker containers while Next.js and the Background Worker run locally on the host for live hot-reloading:

```bash
# 1. Clone and install
git clone https://github.com/mbardi942/monitor.git
cd monitor
pnpm install

# 2. Start PostgreSQL and Redis infrastructure containers
docker compose up -d postgres redis

# 3. Configure environment variables
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```env
NEXT_PUBLIC_USE_MOCK=false
DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/apimonitor
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your_64_character_hex_key_here
# Optional email settings
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=API Monitor <alerts@apimonitor.dev>
```

> **Important:** When running locally on the host (`pnpm dev`), this file **must** be placed in `apps/web/.env.local` so Next.js can compile `NEXT_PUBLIC_*` flags into the client bundle. Placing `.env` in the monorepo root is reserved for full-stack Docker execution (`docker compose up -d`).


##### 4. Database Schema Initialization
When `docker compose up -d postgres` runs for the first time on a fresh volume, the initial relational schema (Point 0) is automatically applied via PostgreSQL's `/docker-entrypoint-initdb.d/` mount.

*(Optional)* If you wish to verify the schema status or apply future incremental migrations manually from the host:
```bash
pnpm --filter @monitor/db db:migrate
```
*On Windows (if execution policy restrictions apply):*
```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @monitor/db db:migrate"
```

##### 5. Launch Web App and Worker Process
```bash
pnpm dev
```
*On Windows:*
```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm dev"
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

### Full Stack Containerized Execution (Docker)

The complete application stack (Next.js 16 frontend in standalone mode, BullMQ worker, PostgreSQL 16, and Redis 7) can be launched simultaneously inside isolated Docker containers without running local Node.js processes:

```bash
# 1. Prepare environment configuration at root (first create a encryption key)
cp .env.example .env
# Edit .env: ensure a 64-character ENCRYPTION_KEY is configured using Generating a Secure ENCRYPTION_KEY

# 2. Build and start all 4 containerized services in background
docker compose up -d --build
# (The database schema is automatically applied on first startup via docker-entrypoint-initdb.d)

# 3. Verify running containers and logs
docker ps
# Inspect background worker logs:
docker logs -f api-monitor-worker

# 4. Access application
# Open http://localhost:3000 in your browser (badge: "Real-time (DB)")

# 5. Stop all containers when done
docker compose down
# (Optional) To completely wipe database volumes and start fresh:
# docker compose down -v
```

---

### Database Inspection with Drizzle Studio

The `@monitor/db` package includes **Drizzle Studio**, a visual database inspection interface:

```bash
pnpm --filter @monitor/db db:studio
```

*On Windows:*
```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @monitor/db db:studio"
```

Once running, navigate to the terminal URL (typically [https://local.drizzle.studio](https://local.drizzle.studio) or [http://127.0.0.1:4983](http://127.0.0.1:4983)).

---

### Troubleshooting

#### 1. Port Conflicts

- **PostgreSQL Port 5432 in use**:
  - *Cause*: A local PostgreSQL service is already running on your machine.
  - *Fix A*: Stop the local service (`net stop postgresql` on Windows, or `sudo systemctl stop postgresql` on Linux/macOS).
  - *Fix B*: Change port mapping in `docker-compose.yml` (e.g., `"5433:5432"`) and update `DATABASE_URL=postgres://postgres:postgrespassword@localhost:5433/apimonitor` in `apps/web/.env.local`.
- **Redis Port 6379 in use**:
  - *Cause*: A local Redis daemon is active.
  - *Fix*: Stop the local daemon or remap in `docker-compose.yml` (e.g., `"6380:6379"`) and update `REDIS_URL=redis://localhost:6380`.
- **Web Port 3000 in use**:
  - *Fix*: Start Next.js on an alternate port: `PORT=3001 pnpm dev`.

#### 2. PowerShell ExecutionPolicy on Windows
If you receive the error:
```text
File ... cannot be loaded because running scripts is disabled on this system.
```
- **Single-command fix**: prepend `powershell -ExecutionPolicy Bypass -Command "<command>"`.
- **Current session fix**:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

#### 3. `ENCRYPTION_KEY` Validation Errors
If you encounter cryptographic errors upon starting the server or accessing the Vault:
- Confirm `ENCRYPTION_KEY` is defined in `apps/web/.env.local` (for host development) or root `.env` (for Docker Compose).
- Verify it is exactly **64 hexadecimal characters** (32 bytes / 256 bits).

---

### Cloud Databases & Alternative DBMS

Thanks to **Hexagonal Architecture (Ports & Adapters)** and **Domain-Driven Design (DDD)**, business rules remain decoupled from persistence technologies:

1. **Cloud PostgreSQL (Supabase, Neon, AWS RDS)**:
   - When connecting to managed cloud PostgreSQL, omit running the local `postgres` container.
   - Simply update `DATABASE_URL` in `apps/web/.env.local`:
     ```env
     DATABASE_URL=postgresql://user:password@db.xxxx.supabase.co:5432/postgres?sslmode=require
     ```
2. **Alternative SQL Engines (MySQL, SQLite)**:
   - Drizzle ORM supports multiple SQL dialects. Switch dialects by updating `packages/db/drizzle.config.ts` and the client in `packages/db/src/index.ts`, then regenerate migrations via `pnpm --filter @monitor/db db:generate`.
3. **NoSQL Databases / Document Stores (MongoDB, Firestore)**:
   - Bounded Contexts define abstract Repository Ports (`MonitorRepository`, `CheckExecutionRepository`, `AlarmRepository`).
   - Integrating a document database requires implementing a new infrastructure adapter package (e.g., `packages/db-firestore`) implementing the same ports, without modifying a single line of the Core Domain (`domain/`).

---

## Monorepo Structure

```
monitor/
├── apps/
│   ├── web/           # Next.js 16 (App Router) — UI, Server Actions, Hono RPC API, Mock/Real Gateways
│   └── worker/        # Background Worker — BullMQ asynchronous probe execution engine
└── packages/
    ├── shared-kernel/ # Core DDD building blocks (AggregateRoot, Entity, ValueObject, DomainEvent)
    ├── monitoring/    # Core domain: Monitor, Alarm, CheckExecution, AuthProfile, polymorphic probes
    ├── scheduling/    # Scheduling context: unified Schedule and cron/interval processor
    ├── notification/  # Multi-channel notifications (Resend Email, Slack Webhook, Generic Webhook)
    ├── reporting/     # Reporting context: Uptime calculation, SLA metrics, time-series aggregations
    ├── db/            # Drizzle ORM schema, versioned migrations, and PostgreSQL client
    └── event-bus/     # In-memory domain event bus for decoupled asynchronous communication
```

### Core Architectural Rules

1. **Domain Purity**: files inside any `domain/` layer may only depend on `@monitor/shared-kernel`. They must not import databases (Drizzle), frameworks (Next.js), or third-party transport libraries.
2. **Event-Driven Decoupling**: Bounded Contexts never invoke each other synchronously. They interact exclusively by publishing **Domain Events** onto the shared event bus.
3. **Gateway Pattern for Frontend**: Next.js interacts with backend operations via Gateway ports, ensuring transparent interchangeability between in-memory mock adapters and real PostgreSQL/Redis persistence.

---

## Test Suite

To run the complete monorepo test suite:

```bash
pnpm test
```

All **95+ automated tests pass (100% green)**:

| Package | Passing Tests | Areas Covered |
|---|---|---|
| `@monitor/monitoring` | 61 | Domain entities, assertion engine, HTTP probes, Heartbeat probes, alarm lifecycle, OAuth2 token manager, script VM sandbox |
| `@monitor/scheduling` | 8 | Schedule validation, cron expression parsing, value objects |
| `@monitor/notification` | 5 | Multi-channel recipient and routing resolution |
| `@monitor/reporting` | 8 | Uptime calculations, SLA compliance metrics, latency percentiles |
| `apps/web` | 34 | Monitor creation/edit forms, Zod schema validation, server actions, dialog components |

---

## Project Documentation

- **[Architecture & DDD Guide (docs/architecture_and_guide.md)](docs/architecture_and_guide.md)** — In-depth architectural breakdown, Bounded Context definitions, polymorphic probes, Credential Vault, and the Gateway Pattern.
- **[Domain Model Specification (docs/domain-model-reference.md)](docs/domain-model-reference.md)** — Formal specification of the ubiquitous language, aggregates, entities, 17 domain events, and 10 domain services.
- **[Contributor Guidelines (CONTRIBUTING.md)](CONTRIBUTING.md)** — Commit conventions, local development environment setup, and architectural guidelines.

---

## License

Released under the [MIT License](LICENSE.md).
