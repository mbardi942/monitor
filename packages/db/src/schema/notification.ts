import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const recipientLists = pgTable("recipient_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  dashboardId: uuid("dashboard_id").notNull(), // Disaccoppiato a livello DB (nessuna FK a dashboards, solo ID)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recipients = pgTable("recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientListId: uuid("recipient_list_id")
    .references(() => recipientLists.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  channels: jsonb("channels").notNull(), // Array di canali abilitati con relative config (es. Slack webhook)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(), // ALARM, REPORT, etc.
  sourceId: varchar("source_id", { length: 255 }).notNull(), // alarmId o reportId
  title: varchar("title", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(), // Dati del report o dell'allarme
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveryAttempts = pgTable("delivery_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id")
    .references(() => notifications.id, { onDelete: "cascade" })
    .notNull(),
  recipientId: uuid("recipient_id")
    .references(() => recipients.id, { onDelete: "cascade" })
    .notNull(),
  channel: varchar("channel", { length: 50 }).notNull(), // EMAIL, SLACK, WEBHOOK
  status: varchar("status", { length: 50 }).notNull(), // PENDING, SENT, FAILED
  error: varchar("error", { length: 1000 }),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
});
