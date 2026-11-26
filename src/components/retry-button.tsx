"use client";

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.replace("/")}
      className="mt-8 h-14 rounded-xl bg-ink px-8 text-lg font-semibold text-white"
    >
      Try again / फिर से
    </button>
  );
}
