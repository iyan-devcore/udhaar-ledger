/** Skeleton shown while a screen loads. */
export default function Loading() {
  return (
    <div className="animate-pulse px-4 pt-5" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 rounded-lg bg-rule/70" />
      <div className="mt-4 h-28 rounded-2xl bg-rule/60" />
      <div className="mt-5 h-13 rounded-xl bg-rule/50" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-[4.5rem] rounded-xl bg-rule/40" />
        ))}
      </div>
    </div>
  );
}
