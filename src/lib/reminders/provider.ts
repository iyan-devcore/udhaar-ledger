import { buildWhatsAppLink } from "./messages";

/**
 * How a reminder reaches the customer. v1 has one provider that only builds a
 * WhatsApp click-to-chat link; the shop owner presses Send himself.
 *
 * Phase 2 adds a provider that sends through the WhatsApp Cloud API with an
 * approved utility template (see whatsapp-cloud.ts). Callers do not change:
 * they handle both result kinds already.
 */

export type ReminderRequest = {
  customerId: number;
  phone: string; // "+91XXXXXXXXXX"
  language: string;
  message: string; // fully rendered text (link provider)
  // Template parameters for providers that need them (phase 2 Cloud API)
  vars: { name: string; amount: string; dueDate: string; shopName: string; upiLink: string };
};

export type ReminderResult =
  | { kind: "open-link"; url: string } // the UI opens this URL; the person sends it
  | { kind: "sent"; providerMessageId: string }; // already sent by the provider

export interface ReminderProvider {
  /** Stored in the reminders log. */
  readonly channel: string;
  send(request: ReminderRequest): Promise<ReminderResult>;
}

export class WhatsAppLinkProvider implements ReminderProvider {
  readonly channel = "whatsapp_link";

  async send(request: ReminderRequest): Promise<ReminderResult> {
    return { kind: "open-link", url: buildWhatsAppLink(request.phone, request.message) };
  }
}

/** The provider used by the app. Phase 2: choose the Cloud API provider when its env vars are set. */
export function getReminderProvider(): ReminderProvider {
  // TODO(phase2): if (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  //   return new WhatsAppCloudProvider({...});
  return new WhatsAppLinkProvider();
}
