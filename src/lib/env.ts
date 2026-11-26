import "server-only";
import path from "node:path";

/**
 * All environment variables the app reads, in one place.
 * See README.md for what each one does.
 */
export const env = {
  /** scrypt hash made with `npm run hash-password`. Preferred in production. */
  passwordHash: process.env.APP_PASSWORD_HASH ?? "",
  /** Plain password, convenient for local development only. */
  passwordPlain: process.env.APP_PASSWORD ?? "",
  /** Secret used to sign the session cookie. At least 32 characters. */
  sessionSecret: process.env.SESSION_SECRET ?? "",
  databasePath: path.resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/ledger.db"),
  backupDir: path.resolve(/*turbopackIgnore: true*/ process.env.BACKUP_DIR ?? "./data/backups"),
  /** Number of nightly backups to keep. */
  backupKeep: Number(process.env.BACKUP_KEEP ?? 14),
  /** Time zone used for "today", due dates and backup names. */
  timeZone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  /** Public URL of the app, used to build /pay links inside reminders. */
  // Render sets RENDER_EXTERNAL_URL automatically.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, ""),
  isProduction: process.env.NODE_ENV === "production",

  // ---- Phase 2 (not used in v1, no external calls are made) ----
  // TODO(phase2): WhatsApp Cloud API provider
  whatsappCloudToken: process.env.WHATSAPP_CLOUD_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "",
  reminderDaysBefore: Number(process.env.REMINDER_DAYS_BEFORE ?? 2),
  // TODO(phase2): payment gateway links + webhook
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
};
