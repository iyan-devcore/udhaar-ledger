"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMutationAuth } from "@/lib/auth/guard";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { customerFormSchema, fieldErrors, idSchema, type CustomerFormErrors } from "@/lib/validation";

export type CustomerFormState = { errors?: CustomerFormErrors; values?: Record<string, string> };

function readForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    name: get("name"),
    phone: get("phone"),
    dueDay: get("dueDay"),
    creditLimit: get("creditLimit"),
    openingBalance: get("openingBalance"),
    notes: get("notes"),
    language: get("language") || "hi",
    isActive: formData.has("hidden") ? false : true,
  };
}

export async function saveCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  await requireMutationAuth();
  const raw = readForm(formData);
  const idRaw = formData.get("id");
  const parsed = customerFormSchema.safeParse(raw);
  if (!parsed.success) {
    const { isActive: _ignored, ...values } = raw;
    void _ignored;
    return { errors: fieldErrors(parsed.error), values };
  }
  const { openingBalance, isActive, ...input } = parsed.data;

  let id: number;
  if (idRaw) {
    id = idSchema.parse(Number(idRaw));
    repo().updateCustomer(id, { ...input, isActive });
  } else {
    id = repo().createCustomer(input, openingBalance ?? 0, today());
  }
  revalidatePath("/");
  redirect(`/customers/${id}`);
}
