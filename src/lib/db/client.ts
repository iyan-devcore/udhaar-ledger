import "server-only";
import { env } from "@/lib/env";
import { openDatabase, type DB } from "./open";

// One connection per server process. Kept on globalThis so hot reload in
// development does not open a new connection on every edit.
const g = globalThis as unknown as { __ledgerDb?: DB };

export function getDb(): DB {
  g.__ledgerDb ??= openDatabase(env.databasePath);
  return g.__ledgerDb;
}
