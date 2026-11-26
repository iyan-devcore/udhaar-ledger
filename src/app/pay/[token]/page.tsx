import type { Metadata } from "next";
import QRCode from "qrcode";
import { getDict, fill, isLang } from "@/lib/i18n";
import { formatPaise } from "@/lib/money";
import { buildUpiLink, firstName } from "@/lib/reminders/messages";
import { repo } from "@/lib/repo";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay",
  robots: { index: false, follow: false },
};

/**
 * PUBLIC page, opened by customers from the WhatsApp reminder.
 * Shows only the shop name, the customer's first name and the amount.
 */
export default async function PayPage({ params }: PageProps<"/pay/[token]">) {
  const { token } = await params;
  const r = repo();
  const found = r.resolvePayToken(token);
  const settings = r.getSettings();
  const lang = found && found !== "expired" && isLang(found.language) ? found.language : "hi";
  const t = getDict(lang);
  const shop = settings.shopName || t.appName;

  const shell = (children: React.ReactNode) => (
    <main lang={lang} className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-8 pb-10">
      <p className="text-center text-lg font-semibold text-ink-soft">{fill(t.payTitle, { shop })}</p>
      {children}
    </main>
  );

  if (!found || found === "expired") {
    return shell(
      <div className="mt-10 rounded-2xl border-2 border-dashed border-rule bg-card px-6 py-10 text-center">
        <p className="text-lg text-text">{t.linkExpired}</p>
      </div>,
    );
  }

  if (!settings.upiId) {
    return shell(
      <div className="mt-10 rounded-2xl border border-rule bg-card px-6 py-8 text-center">
        <p className="num text-4xl font-extrabold">{formatPaise(found.amount)}</p>
        <p className="mt-4 text-base text-muted">{t.upiNotSet}</p>
      </div>,
    );
  }

  const upi = buildUpiLink({ vpa: settings.upiId, payeeName: shop, amountPaise: found.amount, note: `${shop} - ${firstName(found.customerName)}` });
  const qrSvg = await QRCode.toString(upi, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#141a3dff", light: "#ffffffff" } });

  return shell(
    <>
      <section className="mt-6 rounded-3xl bg-ink px-6 py-6 text-center text-white">
        <p className="text-lg text-white/80">{fill(t.hello, { name: firstName(found.customerName) })}</p>
        <p className="mt-3 text-base text-white/70">{t.amountDue}</p>
        <p className="num text-[3rem] leading-tight font-extrabold">{formatPaise(found.amount)}</p>
      </section>

      <a
        href={upi}
        className="mt-5 flex h-16 items-center justify-center rounded-2xl bg-paid text-xl font-bold text-white shadow-md shadow-paid/25 active:scale-[0.99]"
      >
        {t.payWithUpi}
      </a>

      <p className="mt-6 text-center text-base text-muted">{t.scanToPay}</p>
      <div
        className="mx-auto mt-3 w-56 rounded-2xl border border-rule bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
        role="img"
        aria-label="UPI QR code"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-rule bg-card px-4 py-2">
        <div className="min-w-0">
          <p className="text-sm text-muted">{t.upiId}</p>
          <p className="truncate text-lg font-semibold text-text">{settings.upiId}</p>
        </div>
        <CopyButton text={settings.upiId} label={t.copy} doneLabel={t.copied} />
      </div>

      <p className="mt-6 text-center text-base text-ink-soft">{t.payAfterNote}</p>
    </>,
  );
}
