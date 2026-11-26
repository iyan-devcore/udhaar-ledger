"use server";

import { revalidatePath } from "next/cache";
import { requireMutationAuth } from "@/lib/auth/guard";
import { repo } from "@/lib/repo";
import { entryInputSchema, entryUpdateSchema, idSchema } from "@/lib/validation";

export type EntryResult = { ok: true; entryId: number; balance: number } | { ok: false; error: string };

function done(customerId: number, entryId: number): EntryResult {
  revalidatePath("/");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, entryId, balance: repo().getBalance(customerId) };
}

export async function addEntry(input: unknown): Promise<EntryResult> {
  await requireMutationAuth();
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "errorGeneric" };
  const entry = repo().addEntry(parsed.data);
  return done(entry.customerId, entry.id);
}

export async function updateEntry(input: unknown): Promise<EntryResult> {
  await requireMutationAuth();
  const parsed = entryUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "errorGeneric" };
  const { id, ...patch } = parsed.data;
  const entry = repo().updateEntry(id, patch);
  return done(entry.customerId, entry.id);
}

export async function deleteEntry(id: unknown): Promise<EntryResult> {
  await requireMutationAuth();
  const entry = repo().softDeleteEntry(idSchema.parse(id));
  return done(entry.customerId, entry.id);
}

export async function restoreEntry(id: unknown): Promise<EntryResult> {
  await requireMutationAuth();
  const entry = repo().restoreEntry(idSchema.parse(id));
  return done(entry.customerId, entry.id);
}
