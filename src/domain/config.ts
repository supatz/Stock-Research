import type { SectorId } from '@/domain/types';

/** Universe thresholds stay in configuration so later pipeline code can share the same defaults. */
export const UNIVERSE_CONFIG = {
  country: 'US',
  megaCapMinUsd: 200_000_000_000,
  largeCapMinUsd: 10_000_000_000,
  historicalLookbackDays: 504,
  historicalMinObservations: 126,
  preferredCohortSize: 30,
  hardMinCohortSize: 20,
  marketDate: '2026-10-12',
  generatedAt: '2026-10-13T01:20:00Z',
  schemaVersion: '1.0.0',
} as const;

export interface SectorDefinition {
  id: SectorId;
  label: string;
  etf: string;
  etfName: string;
}

export const SECTORS: readonly SectorDefinition[] = [
  { id: 'information-technology', label: 'Technology', etf: 'XLK', etfName: 'Technology Select Sector SPDR' },
  { id: 'financials', label: 'Financials', etf: 'XLF', etfName: 'Financial Select Sector SPDR' },
  { id: 'health-care', label: 'Health Care', etf: 'XLV', etfName: 'Health Care Select Sector SPDR' },
  { id: 'consumer-discretionary', label: 'Consumer Discretionary', etf: 'XLY', etfName: 'Consumer Discretionary Select Sector SPDR' },
  { id: 'consumer-staples', label: 'Consumer Staples', etf: 'XLP', etfName: 'Consumer Staples Select Sector SPDR' },
  { id: 'industrials', label: 'Industrials', etf: 'XLI', etfName: 'Industrial Select Sector SPDR' },
  { id: 'energy', label: 'Energy', etf: 'XLE', etfName: 'Energy Select Sector SPDR' },
  { id: 'utilities', label: 'Utilities', etf: 'XLU', etfName: 'Utilities Select Sector SPDR' },
  { id: 'real-estate', label: 'Real Estate', etf: 'XLRE', etfName: 'Real Estate Select Sector SPDR' },
  { id: 'materials', label: 'Materials', etf: 'XLB', etfName: 'Materials Select Sector SPDR' },
  { id: 'communication-services', label: 'Communication Services', etf: 'XLC', etfName: 'Communication Services Select Sector SPDR' },
] as const;

const BY_ID = new Map(SECTORS.map((sector) => [sector.id, sector]));

export function sectorById(id: SectorId): SectorDefinition {
  const sector = BY_ID.get(id);
  if (!sector) {
    throw new Error(`Unknown sector: ${id}`);
  }
  return sector;
}

export function capTierFor(marketCapUsd: number): 'mega' | 'large' {
  return marketCapUsd >= UNIVERSE_CONFIG.megaCapMinUsd ? 'mega' : 'large';
}

export const PROVENANCE_NOTE =
  'Deterministic mock snapshot for interface development. These figures are not live market data and are not investment advice.';
