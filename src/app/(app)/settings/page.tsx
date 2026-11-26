import Link from "next/link";
import { requirePageAuth } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { backups } from "@/lib/backup-service";
import { formatPaise } from "@/lib/money";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";
import { logout } from "@/app/login/actions";
import { IconDownload } from "@/components/icons";
import { BackupNowButton, ImportCsvForm, LanguagePicker, RestoreJsonForm, ShopSettingsForm } from "@/components/settings-forms";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mt-4 rounded-2xl border border-rule bg-card p-4">
      <h2 className="mb-3 text-lg font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function SettingsPage() {
  await requirePageAuth();
  const { t } = await getT();
  const r = repo();
  const s = r.getSettings();
  const files = backups.list();
  const hidden = r.listCustomerSummaries(today(), { includeInactive: true }).filter((c) => !c.isActive);
  const recent = r.recentReminders(10);
  const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: process.env.APP_TIMEZONE ?? "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const downloadCls = "flex h-12 items-center gap-3 rounded-xl border-2 border-rule px-3 text-base font-semibold text-ink active:bg-paper";

  return (
    <main className="pb-6">
      <header className="px-4 pt-4">
        <h1 className="text-xl font-bold text-ink">{t.settingsTitle}</h1>
      </header>

      <Section title={t.appLanguage}>
        <LanguagePicker />
      </Section>

      <Section title={t.shop}>
        <ShopSettingsForm shopName={s.shopName} upiId={s.upiId} templates={s.templates} />
      </Section>

      <Section title={t.backups}>
        <BackupNowButton />
        <div className="mt-4 flex flex-col gap-2">
          <a href="/api/export/backup.json" className={downloadCls}>
            <IconDownload size={20} /> {t.exportJson}
          </a>
          <a href="/api/export/customers.csv" className={downloadCls}>
            <IconDownload size={20} /> {t.exportCustomersCsv}
          </a>
          <a href="/api/export/entries.csv" className={downloadCls}>
            <IconDownload size={20} /> {t.exportEntriesCsv}
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <ImportCsvForm />
          <RestoreJsonForm />
        </div>

        <h3 className="mt-5 mb-2 text-base font-semibold text-ink-soft">{t.lastBackups}</h3>
        {files.length === 0 ? (
          <p className="text-base text-muted">{t.noBackups}</p>
        ) : (
          <ul className="divide-y divide-rule rounded-xl border border-rule">
            {files.map((f) => (
              <li key={f.name}>
                <a href={`/api/backups/${f.name}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm active:bg-paper">
                  <span className="num truncate text-text">{f.name.replace(/^ledger-|\.db$/g, "")}</span>
                  <span className="num shrink-0 text-muted">{fmtSize(f.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {recent.length > 0 && (
        <Section title={t.remindersLog}>
          <ul className="divide-y divide-rule">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-base">
                <Link href={`/customers/${m.customerId}`} className="min-w-0 truncate font-medium text-ink">
                  {m.name}
                </Link>
                <span className="num shrink-0 text-sm text-muted">
                  {formatPaise(m.amount)} · {dateTime.format(new Date(m.sentAt))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {hidden.length > 0 && (
        <Section title={t.hiddenCustomers}>
          <ul className="divide-y divide-rule">
            {hidden.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex items-center justify-between py-2.5 text-base">
                  <span className="font-medium text-text">{c.name}</span>
                  <span className="num text-muted">{formatPaise(c.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <form action={logout} className="mx-4 mt-6">
        <button type="submit" className="h-13 w-full rounded-xl border-2 border-over/40 text-lg font-semibold text-over">
          {t.logout}
        </button>
      </form>
    </main>
  );
}
