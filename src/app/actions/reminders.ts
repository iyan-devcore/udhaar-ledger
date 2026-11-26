"use server";

import { revalidatePath } from "next/cache";
import { requireMutationAuth } from "@/lib/auth/guard";
import { sendReminder } from "@/lib/reminders/service";
import { idSchema } from "@/lib/validation";

export type ReminderActionResult = { ok: true; url?: string } | { ok: false; error: string };

export async function remindCustomer(customerId: unknown): Promise<ReminderActionResult> {
  await requireMutationAuth();
  const id = idSchema.safeParse(customerId);
  if (!id.success) return { ok: false, error: "errorGeneric" };
  const res = await sendReminder(id.data);
  revalidatePath("/due");
  revalidatePath("/settings");
  if (!res.ok) return { ok: false, error: res.error === "paidUp" ? "paidUp" : res.error === "noPhone" ? "noPhone" : "errorGeneric" };
  return res.result.kind === "open-link" ? { ok: true, url: res.result.url } : { ok: true };
}
