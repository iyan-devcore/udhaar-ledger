import Link from "next/link";
import { IconBack } from "./icons";

/** Top bar with a back button and a title. */
export function PageHeader({ title, backHref, backLabel, right }: { title: string; backHref: string; backLabel: string; right?: React.ReactNode }) {
  return (
    <header className="no-print flex items-center gap-1 px-2 pt-3 pb-3">
      <Link href={backHref} aria-label={backLabel} className="grid h-12 w-12 place-items-center rounded-full text-ink active:bg-rule/50">
        <IconBack size={28} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-ink">{title}</h1>
      {right}
    </header>
  );
}
