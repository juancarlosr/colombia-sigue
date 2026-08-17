// Dot-cluster brand mark: lime + light blue, echoing the warmth of
// humanitarian foundation identities.
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="5" className="fill-primary" />
      <circle cx="17.5" cy="10.5" r="3.5" className="fill-sky-400" />
      <circle cx="11" cy="17.5" r="3" className="fill-sky-300" />
    </svg>
  );
}

export function BrandWordmark() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark />
      <span className="text-lg font-extrabold tracking-tight">
        Colombia <span className="text-sky-600 dark:text-sky-400">Sigue</span>
      </span>
    </span>
  );
}
