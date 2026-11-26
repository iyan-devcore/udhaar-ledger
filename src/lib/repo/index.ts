import "server-only";
import { getDb } from "@/lib/db/client";
import { createRepo, type Repo } from "./repo";

const g = globalThis as unknown as { __ledgerRepo?: Repo };

/** The app-wide repository bound to the real database. */
export function repo(): Repo {
  g.__ledgerRepo ??= createRepo(getDb());
  return g.__ledgerRepo;
}

export * from "./repo";
