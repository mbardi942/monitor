import { pgTable, uuid, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetId: varchar("target_id", { length: 255 }).notNull(), // Può essere monitorId o dashboardId
  targetType: varchar("target_type", { length: 50 }).notNull(), // MONITOR o REPORT
  cron: varchar("cron", { length: 255 }), // Cron expression
  intervalSeconds: integer("interval_seconds"), // Intervallo in secondi
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
