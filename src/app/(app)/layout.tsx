import { BottomNav } from "@/components/bottom-nav";
import { requirePageAuth } from "@/lib/auth/guard";
import { repo } from "@/lib/repo";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";

/** Shell for every logged-in screen: content plus the bottom navigation. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageAuth();
  const dueCount = repo()
    .listCustomerSummaries(today())
    .filter((c) => c.status === "overdue" || c.status === "soon").length;

  return (
    <>
      <div className="pb-nav mx-auto min-h-dvh max-w-xl">{children}</div>
      <BottomNav dueCount={dueCount} />
    </>
  );
}
