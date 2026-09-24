import { Hono } from "hono";
import { handle } from "hono/vercel";
import { dashboardsRouter } from "./routes/dashboards";
import { monitorsRouter } from "./routes/monitors";
import { alarmsRouter } from "./routes/alarms";
import { reportsRouter } from "./routes/reports";
import { recipientsRouter } from "./routes/recipients";
import { heartbeatsRouter } from "./routes/heartbeats";

export const dynamic = "force-dynamic";

// Le route sono concatenate per consentire l'inferenza dei tipi RPC (hc<AppType>).
const app = new Hono()
  .basePath("/api")
  .route("/", dashboardsRouter)
  .route("/", monitorsRouter)
  .route("/", alarmsRouter)
  .route("/", reportsRouter)
  .route("/", recipientsRouter)
  .route("/", heartbeatsRouter);

// GET e POST (POST supportato per webhook ingestione heartbeats)
export const GET = handle(app);
export const POST = handle(app);


export type AppType = typeof app;
