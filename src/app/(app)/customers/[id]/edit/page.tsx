import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { paiseToDecimal } from "@/lib/money";
import { repo } from "@/lib/repo";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  await requirePageAuth();
  const id = Number((await params).id);
  const c = Number.isInteger(id) && id > 0 ? repo().getCustomer(id) : undefined;
  if (!c) notFound();
  const { t } = await getT();
  return (
    <main>
      <PageHeader title={t.editCustomer} backHref={`/customers/${c.id}`} backLabel={t.back} />
      <CustomerForm
        cancelHref={`/customers/${c.id}`}
        defaults={{
          id: c.id,
          name: c.name,
          phone: c.phone.replace(/^\+91/, ""),
          dueDay: String(c.dueDay),
          creditLimit: c.creditLimit ? paiseToDecimal(c.creditLimit).replace(/\.00$/, "") : "",
          notes: c.notes,
          language: c.language,
          isActive: c.isActive,
        }}
      />
    </main>
  );
}
