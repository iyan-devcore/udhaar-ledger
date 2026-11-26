import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Database schema. Money columns are integer paise. Dates are "YYYY-MM-DD"
 * text, timestamps are ISO 8601 UTC text. Kept portable so the same model
 * can move to Postgres later (only this file and db/client.ts would change).
 */

const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""), // "+91XXXXXXXXXX" or ""
  dueDay: integer("due_day").notNull(), // 1..31
  creditLimit: integer("credit_limit"), // paise, optional
  notes: text("notes").notNull().default(""),
  language: text("language").notNull().default("hi"), // reminder language
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(nowSql),
});

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    type: text("type", { enum: ["credit", "payment"] }).notNull(),
    amount: integer("amount").notNull(), // paise, always positive
    note: text("note").notNull().default(""),
    entryDate: text("entry_date").notNull(), // YYYY-MM-DD
    createdAt: text("created_at").notNull().default(nowSql),
    editedAt: text("edited_at"),
    deletedAt: text("deleted_at"), // soft delete
  },
  (t) => [index("entries_customer_date_idx").on(t.customerId, t.entryDate)],
);

/** Every edit, delete and restore of financial data, with previous values. */
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(), // "entry" | "customer" | "data"
  entityId: integer("entity_id"),
  action: text("action").notNull(), // "update" | "delete" | "restore" | "import"
  before: text("before"), // JSON
  after: text("after"), // JSON
  at: text("at").notNull().default(nowSql),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const reminders = sqliteTable(
  "reminders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    channel: text("channel").notNull(), // "whatsapp_link" now, "whatsapp_cloud" in phase 2
    amount: integer("amount").notNull(),
    sentAt: text("sent_at").notNull().default(nowSql),
  },
  (t) => [index("reminders_customer_idx").on(t.customerId, t.sentAt)],
);

/** Unguessable tokens for the public /pay/<token> page. */
export const payTokens = sqliteTable("pay_tokens", {
  token: text("token").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull().default(nowSql),
  expiresAt: text("expires_at").notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;
export type ReminderRow = typeof reminders.$inferSelect;
export type PayToken = typeof payTokens.$inferSelect;
