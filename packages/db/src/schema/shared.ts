import { pgTable, varchar, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const processedEvents = pgTable(
  "processed_events",
  {
    eventId: varchar("event_id", { length: 255 }).notNull(),
    handlerName: varchar("handler_name", { length: 255 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.handlerName] }),
  })
);
