"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { IconClock, IconSettings, IconUsers } from "./icons";

export function BottomNav({ dueCount }: { dueCount: number }) {
  const { t } = useI18n();
  const path = usePathname();
  const tabs = [
    { href: "/", label: t.navCustomers, icon: IconUsers, active: path === "/" || path.startsWith("/customers") },
    { href: "/due", label: t.navDue, icon: IconClock, active: path.startsWith("/due"), badge: dueCount },
    { href: "/settings", label: t.navSettings, icon: IconSettings, active: path.startsWith("/settings") },
  ];
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-3">
        {tabs.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-1 rounded-b bg-ink" />}
              <span className="relative">
                <Icon size={26} strokeWidth={active ? 2.4 : 2} />
                {badge ? (
                  <span className="num absolute -top-1.5 -right-3 min-w-5 rounded-full bg-over px-1 text-center text-xs leading-5 text-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
