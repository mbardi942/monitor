import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  dashboardId: uuid("dashboard_id").notNull(), // Disaccoppiato a livello DB
  status: varchar("status", { length: 50 }).notNull(), // DRAFT, CONFIRMED, SENT
  periodFrom: timestamp("period_from", { withTimezone: true }).notNull(),
  periodTo: timestamp("period_to", { withTimezone: true }).notNull(),
  content: jsonb("content").notNull(), // Metriche aggregate dei monitor
  customText: varchar("custom_text", { length: 2000 }), // Note manuali inserite dall'utente
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  layout: jsonb("layout").notNull(), // Layout personalizzato del report
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
