import fs from "node:fs";
import path from "node:path";
import { isLoggedIn } from "@/lib/auth/guard";
import { isBackupName } from "@/lib/backup";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Downloads one SQLite backup file from the backups folder. */
export async function GET(_req: Request, ctx: RouteContext<"/api/backups/[name]">) {
  if (!(await isLoggedIn())) return new Response("Not logged in", { status: 401 });
  const { name } = await ctx.params;
  if (!isBackupName(name)) return new Response("Not found", { status: 404 });
  const file = path.join(env.backupDir, name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(file), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
