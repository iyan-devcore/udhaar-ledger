import { requirePageAuth } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requirePageAuth();
  return <main className="p-4">Logged in</main>;
}
