/** Presentational star rating (no client JS). Accepts 0–5, supports halves. */
export function RatingStars({ value }: { value?: number | string }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${n} out of 5`}>
      <span className="relative text-line">
        ★★★★★
        <span className="absolute inset-0 overflow-hidden text-brand-500" style={{ width: `${(n / 5) * 100}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="text-sm font-medium text-muted">{n.toFixed(1)}</span>
    </span>
  );
}
