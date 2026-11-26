import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-2xl font-bold text-ink">404</p>
      <p className="mt-2 text-lg text-muted">{t.pageNotFound}</p>
      <Link href="/" className="mt-6 flex h-12 items-center rounded-xl bg-ink px-6 text-lg font-semibold text-white">
        {t.navCustomers}
      </Link>
    </main>
  );
}
