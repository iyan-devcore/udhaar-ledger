import "server-only";
import { env } from "@/lib/env";
import { todayIn } from "@/lib/dates";

/** Today's date at the shop (APP_TIMEZONE, Asia/Kolkata by default). */
export function today(): string {
  return todayIn(env.timeZone);
}
