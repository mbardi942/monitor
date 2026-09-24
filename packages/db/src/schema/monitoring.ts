import { pgTable, uuid, varchar, jsonb, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull(),
  reportConfig: jsonb("report_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const monitors = pgTable("monitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // HTTP, PING, etc.
  status: varchar("status", { length: 50 }).notNull(), // UP, DOWN, DEGRADED, PAUSED
  probeConfiguration: jsonb("probe_configuration").notNull(), // Config specific per probe
  schedule: jsonb("schedule").notNull(), // Cron o intervallo
  assertionRules: jsonb("assertion_rules").notNull(), // Regole di validazione
  alarmPolicy: jsonb("alarm_policy").notNull(), // Criteri allarme
  recipientIds: jsonb("recipient_ids").$type<string[]>().default([]).notNull(), // Destinatari specifici
  dataExtractor: jsonb("data_extractor"), // Config estrazione dati
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dashboardMonitors = pgTable(
  "dashboard_monitors",
  {
    dashboardId: uuid("dashboard_id")
      .references(() => dashboards.id, { onDelete: "cascade" })
      .notNull(),
    monitorId: uuid("monitor_id")
      .references(() => monitors.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dashboardId, table.monitorId] }),
  })
);

export const checkExecutions = pgTable("check_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitorId: uuid("monitor_id")
    .references(() => monitors.id, { onDelete: "cascade" })
    .notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // UP, DOWN, DEGRADED
  probeHealth: varchar("probe_health", { length: 50 }).default("HEALTHY").notNull(), // HEALTHY, UNHEALTHY, TIMEOUT, ERROR
  dataAlertLevel: varchar("data_alert_level", { length: 50 }), // NORMAL, WARNING, CRITICAL
  responseTimeMs: integer("response_time_ms").notNull(),
  extractedData: jsonb("extracted_data"),
  assertionResults: jsonb("assertion_results").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alarms = pgTable("alarms", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitorId: uuid("monitor_id")
    .references(() => monitors.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 50 }).notNull(), // OPEN, CONFIRMED, NOTIFIED, RESOLVED
  severity: varchar("severity", { length: 50 }).notNull(), // CRITICAL, WARNING, INFO
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  failureAccumulator: jsonb("failure_accumulator").notNull(), // Dati sui check falliti consecutivi
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authProfiles = pgTable("auth_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  dashboardId: uuid("dashboard_id")
    .references(() => dashboards.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // BEARER, API_KEY, BASIC_AUTH, CUSTOM_HEADERS
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

