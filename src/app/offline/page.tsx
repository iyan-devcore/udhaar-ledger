import { RetryButton } from "@/components/retry-button";

/** Shown by the service worker when the phone has no internet. Static, no data. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink text-3xl font-bold text-white">₹</div>
      <h1 className="mt-6 text-2xl font-bold text-ink">No internet</h1>
      <p className="mt-1 text-xl font-semibold text-ink" lang="hi">
        इंटरनेट नहीं है
      </p>
      <p className="mt-4 text-base text-muted">Your data is safe. Connect to the internet and try again.</p>
      <p className="mt-1 text-base text-muted" lang="hi">
        आपका हिसाब सुरक्षित है। इंटरनेट चालू करके फिर से खोलें।
      </p>
      <RetryButton />
    </main>
  );
}
