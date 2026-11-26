import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requirePageAuth();
  const { t, lang } = await getT();
  return (
    <main>
      <PageHeader title={t.newCustomer} backHref="/" backLabel={t.back} />
      <CustomerForm
        cancelHref="/"
        defaults={{ name: "", phone: "", dueDay: "1", creditLimit: "", notes: "", language: lang, isActive: true }}
      />
    </main>
  );
}
