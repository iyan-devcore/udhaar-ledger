import { redirect } from "next/navigation";
import { configProblems, isLoggedIn } from "@/lib/auth/guard";
import { getT } from "@/lib/i18n/server";
import { LangToggle } from "@/components/lang-toggle";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isLoggedIn()) redirect("/");
  const { t } = await getT();
  const problems = configProblems();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6 pb-10">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="mt-16 mb-10">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-ink text-3xl font-bold text-white">₹</div>
        <h1 className="text-3xl font-bold text-ink">{t.appName}</h1>
        <p className="mt-1 text-lg text-muted">{t.loginTitle}</p>
      </div>
      {problems.length > 0 ? (
        <div className="rounded-xl border-2 border-over bg-over-bg p-4 text-over">
          <p className="font-semibold">{t.configMissing}</p>
          <ul className="mt-2 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
