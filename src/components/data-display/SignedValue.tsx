import { formatPercent } from '@/domain/metrics/format';

export function SignedValue({
  value,
  digits = 1,
}: {
  value: number | null | undefined;
  digits?: number;
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className="num">—</span>;
  }
  const direction = value > 0.0001 ? 'up' : value < -0.0001 ? 'down' : 'flat';
  const word = direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'flat';
  return (
    <span className={`num signed signed-${direction} signed-emphasis`} data-direction={direction}>
      <span className="sr-only">{word} </span>
      {formatPercent(value, digits)}
    </span>
  );
}
