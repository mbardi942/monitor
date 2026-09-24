# @monitor/web — Next.js Frontend & RPC API

Frontend web application built on **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS**, and **Hono RPC**, serving as the primary user interface and edge API gateway for the **SaaS API Monitor** platform.

---

## Quick Start

This package is typically started from the monorepo root via:

```bash
pnpm dev
```

To run only the web application independently:

```bash
pnpm --filter @monitor/web dev
```

The web interface will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

For local host development (`pnpm dev`), Next.js requires the environment file inside this directory (`apps/web/.env.local`). Do **not** place it in the monorepo root for host development, as Next.js will not load client-side `NEXT_PUBLIC_*` variables from the root.

Create an `.env.local` file inside `apps/web/`:

```env
# When true, the interface utilizes in-memory gateways with simulated mock datasets (no PostgreSQL or Redis required)
NEXT_PUBLIC_USE_MOCK=true

# Required only when NEXT_PUBLIC_USE_MOCK=false
DATABASE_URL=postgres://postgres:postgrespassword@localhost:5432/apimonitor
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your_64_character_hex_key_here
```

---

## Frontend Architecture

- **App Router (`app/`)**: Dynamic routing partitioned by `[dashboardId]`, leveraging React Server Components for data fetching and Client Components for interactive forms and charts.
- **Feature-Driven Organization (`features/`)**: Slices grouped by functional domain contexts (`monitors`, `dashboard`, `alarms`, `reports`, `recipients`).
- **Gateway Ports & Adapters (`infrastructure/`)**: Total decoupling from persistence sources. Components consume Gateway interface ports exclusively, enabling transparent switching between simulated in-memory mocks and live backend databases.
- **Hono RPC (`app/api/[[...route]]`)**: End-to-end type-safe API endpoints integrated directly inside the Next.js runtime.
