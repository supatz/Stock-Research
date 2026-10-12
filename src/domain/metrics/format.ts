const ORDINALS = new Map<number, string>([
  [1, 'st'],
  [2, 'nd'],
  [3, 'rd'],
]);

export function formatPercentile(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  const rounded = Math.round(value);
  const mod100 = Math.abs(rounded) % 100;
  const mod10 = Math.abs(rounded) % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : (ORDINALS.get(mod10) ?? 'th');
  return `${rounded}${suffix}`;
}

export function formatPercent(value: number | null | undefined, digits = 1, signed = true): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value).toFixed(digits);
  if (!signed) {
    return `${abs}%`;
  }
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${(0).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(digits);
}

export function formatSignedNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return (0).toFixed(digits);
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `$${value.toFixed(2)}`;
}

export function formatMarketCap(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) {
    return '—';
  }
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  return `$${(usd / 1e6).toFixed(0)}M`;
}

export function formatVolume(shares: number | null | undefined): string {
  if (shares == null || !Number.isFinite(shares)) {
    return '—';
  }
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(2)}B`;
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(1)}M`;
  return Math.round(shares).toLocaleString('en-US');
}

export function formatDollars(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)}×`;
}

export function formatCohort(label: string, sampleSize: number): string {
  return `${label} · n=${sampleSize}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatAsOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatGeneratedAt(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
