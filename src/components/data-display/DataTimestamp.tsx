import { formatAsOf } from '@/domain/metrics/format';

export function DataTimestamp({
  asOf,
  stale = false,
  prefix = 'Data as of',
}: {
  asOf: string;
  stale?: boolean;
  prefix?: string;
}) {
  return (
    <p className={stale ? 'timestamp is-stale' : 'timestamp'}>
      <time dateTime={`${asOf}T20:00:00Z`}>
        {prefix} {formatAsOf(asOf)} 4:00 PM ET
      </time>
      {stale ? <span className="flag">Stale</span> : null}
    </p>
  );
}
