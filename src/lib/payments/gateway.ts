/**
 * PHASE 2 — NOT USED IN v1. No network calls are made from this file today.
 *
 * In v1 customers pay by UPI directly to the shop's UPI ID from the public
 * /pay/<token> page, and the shop owner records the payment by hand with
 * "Received payment".
 *
 * Phase 2 plan (Razorpay as the example gateway):
 * 1. Env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 * 2. createPaymentLink(): POST https://api.razorpay.com/v1/payment_links with
 *    amount (paise), currency "INR", reference_id = pay token, and
 *    notes.customerId. Show the returned short_url on the pay page instead of
 *    (or next to) the plain UPI button.
 * 3. Webhook route app/api/webhooks/razorpay/route.ts:
 *    - verify X-Razorpay-Signature = HMAC-SHA256(rawBody, WEBHOOK_SECRET)
 *    - on "payment_link.paid", look up the token, and add a "payment" entry
 *      with note "Razorpay <payment id>" (idempotent: store the payment id and
 *      ignore repeats), then write an audit log row.
 *    - exclude the route from the login check in proxy.ts.
 */

export type PaymentLinkRequest = {
  token: string;
  customerId: number;
  amountPaise: number;
  description: string;
};

export interface PaymentGateway {
  createPaymentLink(request: PaymentLinkRequest): Promise<{ url: string; providerId: string }>;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

// TODO(phase2): export class RazorpayGateway implements PaymentGateway { ... }
