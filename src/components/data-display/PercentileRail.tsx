import { formatPercentile } from '@/domain/metrics/format';

export function PercentileRail({
  label,
  percentile,
  sampleSize,
  cohortLabel,
  fallbackDetail,
  message,
}: {
  label: string;
  percentile: number | null;
  sampleSize?: number;
  cohortLabel?: string;
  fallbackDetail?: string;
  message?: string;
}) {
  const unavailable = percentile == null;
  const valueLabel = unavailable ? 'Unavailable' : formatPercentile(percentile);
  return (
    <div className="percentile-block">
      <div className="percentile-top">
        <span>{label}</span>
        <strong data-role="percentile">{valueLabel}</strong>
      </div>
      {unavailable ? null : (
        <div
          className="percentile-track"
          role="img"
          aria-label={`${label} ${valueLabel}`}
        >
          <span className="percentile-marker" style={{ left: `${Math.min(100, Math.max(0, percentile))}%` }} />
        </div>
      )}
      {unavailable ? null : (
        <p className="percentile-meta">
          {cohortLabel ? `${cohortLabel} · n=${sampleSize ?? 0}` : `${sampleSize ?? 0} obs`}
        </p>
      )}
      {fallbackDetail ? <p className="percentile-note">{fallbackDetail}</p> : null}
      {unavailable && message ? <p className="percentile-note">{message}</p> : null}
      {unavailable && !message && cohortLabel ? <p className="percentile-note">{cohortLabel}</p> : null}
    </div>
  );
}
