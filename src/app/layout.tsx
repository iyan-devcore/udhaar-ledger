import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Udhar Khata",
  description: "Customer credit ledger for the shop",
  applicationName: "Udhar Khata",
  appleWebApp: { capable: true, title: "Udhar Khata", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b2463",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  return (
    <html lang={lang === "hi" ? "hi" : "en"}>
      <body className="min-h-dvh antialiased">
        <I18nProvider lang={lang} t={t}>
          {children}
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
