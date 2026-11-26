import type { ReminderProvider, ReminderRequest, ReminderResult } from "./provider";

/**
 * PHASE 2 — NOT USED IN v1. No network calls are made from this file today.
 *
 * Plan:
 * 1. Create a WhatsApp Business account in Meta Business Manager and register
 *    the shop's number. Note the Phone Number ID.
 * 2. Get a utility message template approved, for example "payment_reminder"
 *    in en and hi, with body parameters in this order:
 *      {{1}} name, {{2}} amount, {{3}} due date, {{4}} shop name, {{5}} pay link
 * 3. Set env vars: WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 *    WHATSAPP_TEMPLATE_NAME (and REMINDER_DAYS_BEFORE for the daily job).
 * 4. Return this provider from getReminderProvider() when those are set.
 * 5. Daily job: once a day (the hourly scheduler in lib/scheduler.ts can do
 *    it), find customers with balance > 0 whose next due date is exactly
 *    REMINDER_DAYS_BEFORE days away, skip anyone reminded in the last 3 days
 *    (reminders table), send, and log with channel "whatsapp_cloud".
 *    Respect the customer's opt-out (add a `remindersOptOut` column first).
 */
export class WhatsAppCloudProvider implements ReminderProvider {
  readonly channel = "whatsapp_cloud";

  constructor(private readonly config: { token: string; phoneNumberId: string; templateName: string }) {}

  async send(request: ReminderRequest): Promise<ReminderResult> {
    void this.config;
    void request;
    // TODO(phase2): POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
    //   headers: Authorization: Bearer {token}
    //   body: {
    //     messaging_product: "whatsapp",
    //     to: request.phone.replace("+", ""),
    //     type: "template",
    //     template: {
    //       name: templateName,
    //       language: { code: request.language === "hi" ? "hi" : "en" },
    //       components: [{ type: "body", parameters: [name, amount, dueDate, shopName, upiLink].map(text => ({ type: "text", text })) }],
    //     },
    //   }
    //   return { kind: "sent", providerMessageId: response.messages[0].id }
    throw new Error("WhatsApp Cloud API provider is not enabled in v1");
  }
}
