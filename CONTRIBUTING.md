# Contributor Guidelines — SaaS API Monitor

Thank you for your interest in contributing to SaaS API Monitor. We welcome bug reports, architectural feedback, feature proposals, and pull requests.

---

## Local Development Setup

### Prerequisites

- **Node.js** v18+
- **pnpm** v9+
- **Docker & Docker Compose** (required only when testing against live PostgreSQL and Redis services)

### Installation

```bash
git clone https://github.com/mbardi942/monitor.git
cd monitor
pnpm install
```

### Running in Mock Mode (Recommended for UI Development)

```bash
cp .env.example apps/web/.env.local
# Ensure that NEXT_PUBLIC_USE_MOCK=true in apps/web/.env.local

pnpm dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000) using in-memory mock datasets. No external database or Redis instance is required.

### Running in Full-Stack Mode (PostgreSQL + Redis)

```bash
# 1. Start infrastructure services
docker compose up -d postgres redis

# 2. Configure environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local: set NEXT_PUBLIC_USE_MOCK=false, DATABASE_URL, REDIS_URL, ENCRYPTION_KEY

# 3. Apply database migrations
pnpm --filter @monitor/db db:migrate

# 4. Start the web application and background worker
pnpm dev
```

---

## Running Tests

All automated tests must pass before submitting a pull request:

```bash
# Run all tests across the monorepo
pnpm test

# Run tests for a specific workspace package
pnpm --filter @monitor/monitoring test
pnpm --filter @monitor/web test
```

---

## Architectural Conventions

This project strictly adheres to **Domain-Driven Design (DDD)** and **Hexagonal Architecture (Ports and Adapters)**. Before modifying business logic, consult the [Architecture & Guide](docs/architecture_and_guide.md).

### Core Guidelines

1. **Domain Purity**: files located in `packages/*/src/domain/` may only import from `@monitor/shared-kernel`. Importing ORMs, web frameworks, or third-party infrastructure libraries into this layer is strictly forbidden.
2. **Decoupled Bounded Contexts**: domain packages (`monitoring`, `scheduling`, `notification`, `reporting`) must never import each other directly. Cross-context communication occurs exclusively via publishing and subscribing to **Domain Events** on the shared event bus.
3. **Gateway Pattern for Frontend**: any new read or write capability consumed by the UI must provide both a `MockGateway` adapter and a production adapter (`HttpGateway` or Server Action). UI components must never communicate directly with persistence layers.
4. **Behavioral Testing**: all domain changes or additions must include automated unit tests under the corresponding package `__tests__/` directory, validating business rules and invariants.

---

## Commit Message Conventions

This repository enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <summary>

[optional body with rationale and context]
```

**Allowed types**: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`

**Key scopes**: `monitoring`, `web`, `worker`, `db`, `notification`, `scheduling`, `reporting`, `repo`

**Examples**:
```
feat(monitoring): add TCP socket probe check
fix(web): correct active alarm counter on dashboard
docs(architecture): add push heartbeat sequence diagram
test(monitoring): test automated OAuth2 token refresh lifecycle
chore(repo): update build tool dependencies
```

---

## License

By contributing to this repository, you agree that your contributions will be licensed under the project's [MIT License](LICENSE.md).
