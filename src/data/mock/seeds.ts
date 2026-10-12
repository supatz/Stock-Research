import type { SectorId } from '@/domain/types';

export interface BenchmarkSeed {
  ticker: string;
  name: string;
  price: number;
  growth: number;
  rangeFrac?: number;
}

export interface StockSeed {
  ticker: string;
  company: string;
  sectorId: SectorId;
  industry: string;
  marketCapB: number;
  price: number;
  growth: number;
  avgVolumeM: number;
  rvol: number;
  rsi: number;
  adx: number;
  kind?: 'geometric' | 'peak';
  peak?: number;
  wave?: number;
  bend?: number;
  rangeFrac?: number;
  pinNearHigh?: boolean;
  sessions?: number;
  endDate?: string;
  cmf?: number | null;
  quality?: 'good' | 'partial' | 'stale' | 'insufficient';
  exchange?: 'NYSE' | 'NASDAQ';
}

export const BENCHMARKS: BenchmarkSeed[] = [
  { ticker: 'SPY', name: 'S&P 500', price: 572.4, growth: 1.26, rangeFrac: 0.009 },
  { ticker: 'QQQ', name: 'Nasdaq 100', price: 498.15, growth: 1.74, rangeFrac: 0.012 },
  { ticker: 'DIA', name: 'Dow Jones', price: 428.6, growth: 1.2, rangeFrac: 0.008 },
  { ticker: 'IWM', name: 'Russell 2000', price: 218.35, growth: 1.05, rangeFrac: 0.014 },
  { ticker: 'XLK', name: 'Technology', price: 232.8, growth: 1.9, rangeFrac: 0.012 },
  { ticker: 'XLF', name: 'Financials', price: 48.22, growth: 1.36, rangeFrac: 0.011 },
  { ticker: 'XLV', name: 'Health Care', price: 148.4, growth: 1.04, rangeFrac: 0.01 },
  { ticker: 'XLY', name: 'Consumer Discretionary', price: 196.1, growth: 1.48, rangeFrac: 0.012 },
  { ticker: 'XLP', name: 'Consumer Staples', price: 82.46, growth: 1.12, rangeFrac: 0.008 },
  { ticker: 'XLI', name: 'Industrials', price: 142.75, growth: 1.44, rangeFrac: 0.011 },
  { ticker: 'XLE', name: 'Energy', price: 86.3, growth: 0.76, rangeFrac: 0.016 },
  { ticker: 'XLU', name: 'Utilities', price: 78.15, growth: 0.9, rangeFrac: 0.009 },
  { ticker: 'XLRE', name: 'Real Estate', price: 42.08, growth: 0.88, rangeFrac: 0.011 },
  { ticker: 'XLB', name: 'Materials', price: 92.55, growth: 1.3, rangeFrac: 0.012 },
  { ticker: 'XLC', name: 'Communication Services', price: 98.7, growth: 1.7, rangeFrac: 0.013 },
];

const NASDAQ = new Set(['AAPL', 'MSFT', 'NVDA', 'AVGO', 'AMD', 'AMZN', 'TSLA', 'COST', 'GOOGL', 'META', 'PEP']);

export const STOCKS: StockSeed[] = [
  { ticker: 'AAPL', company: 'Apple', sectorId: 'information-technology', industry: 'Consumer electronics', marketCapB: 3450, price: 228.4, growth: 2.12, avgVolumeM: 52, rvol: 0.92, rsi: 71.4, adx: 31, pinNearHigh: true, rangeFrac: 0.013 },
  { ticker: 'MSFT', company: 'Microsoft', sectorId: 'information-technology', industry: 'Software', marketCapB: 3180, price: 428.15, growth: 1.46, avgVolumeM: 22, rvol: 1.02, rsi: 58.2, adx: 23, bend: -0.055, rangeFrac: 0.011 },
  { ticker: 'NVDA', company: 'NVIDIA', sectorId: 'information-technology', industry: 'Semiconductors', marketCapB: 3050, price: 131.2, growth: 2.55, avgVolumeM: 210, rvol: 2.35, rsi: 76.8, adx: 39, pinNearHigh: true, wave: 0.02, rangeFrac: 0.026 },
  { ticker: 'AVGO', company: 'Broadcom', sectorId: 'information-technology', industry: 'Semiconductors', marketCapB: 820, price: 172.45, growth: 1.5, avgVolumeM: 24, rvol: 1.15, rsi: 62.1, adx: 28, rangeFrac: 0.015 },
  { ticker: 'ORCL', company: 'Oracle', sectorId: 'information-technology', industry: 'Software', marketCapB: 480, price: 168.3, growth: 1.18, avgVolumeM: 11, rvol: 0.84, rsi: 49.5, adx: 18, bend: -0.03, rangeFrac: 0.014, exchange: 'NYSE' },
  { ticker: 'AMD', company: 'Advanced Micro Devices', sectorId: 'information-technology', industry: 'Semiconductors', marketCapB: 180, price: 156.75, growth: 1.95, avgVolumeM: 48, rvol: 1.72, rsi: 68.4, adx: 27, wave: 0.028, rangeFrac: 0.03 },
  { ticker: 'JPM', company: 'JPMorgan Chase', sectorId: 'financials', industry: 'Banks', marketCapB: 680, price: 224.1, growth: 1.52, avgVolumeM: 9, rvol: 1.05, rsi: 57, adx: 26, rangeFrac: 0.012, exchange: 'NYSE' },
  { ticker: 'V', company: 'Visa', sectorId: 'financials', industry: 'Payments', marketCapB: 590, price: 312.8, growth: 1.22, avgVolumeM: 6, rvol: 0.7, rsi: 51.2, adx: 17, rangeFrac: 0.008, exchange: 'NYSE' },
  { ticker: 'MA', company: 'Mastercard', sectorId: 'financials', industry: 'Payments', marketCapB: 470, price: 498.25, growth: 1.58, avgVolumeM: 3, rvol: 0.88, rsi: 60.4, adx: 24, rangeFrac: 0.01, exchange: 'NYSE' },
  { ticker: 'BAC', company: 'Bank of America', sectorId: 'financials', industry: 'Banks', marketCapB: 310, price: 42.18, growth: 1.38, avgVolumeM: 38, rvol: 1.1, rsi: 54, adx: 21, rangeFrac: 0.013, exchange: 'NYSE' },
  { ticker: 'LLY', company: 'Eli Lilly', sectorId: 'health-care', industry: 'Pharmaceuticals', marketCapB: 780, price: 892.4, growth: 2.25, avgVolumeM: 3.4, rvol: 1.28, rsi: 70.2, adx: 34, pinNearHigh: true, rangeFrac: 0.014, exchange: 'NYSE' },
  { ticker: 'UNH', company: 'UnitedHealth', sectorId: 'health-care', industry: 'Managed care', marketCapB: 460, price: 342.6, growth: 0.78, avgVolumeM: 7, rvol: 1.85, rsi: 28.4, adx: 30, kind: 'peak', peak: 1.55, rangeFrac: 0.024, exchange: 'NYSE' },
  { ticker: 'JNJ', company: 'Johnson & Johnson', sectorId: 'health-care', industry: 'Pharmaceuticals', marketCapB: 390, price: 162.45, growth: 1.1, avgVolumeM: 8, rvol: 0.62, rsi: 46.8, adx: 15, rangeFrac: 0.007, exchange: 'NYSE' },
  { ticker: 'AMZN', company: 'Amazon', sectorId: 'consumer-discretionary', industry: 'Internet retail', marketCapB: 1980, price: 188.55, growth: 1.66, avgVolumeM: 42, rvol: 1.08, rsi: 56.5, adx: 25, rangeFrac: 0.015 },
  { ticker: 'TSLA', company: 'Tesla', sectorId: 'consumer-discretionary', industry: 'Automobiles', marketCapB: 640, price: 248.9, growth: 1.72, avgVolumeM: 95, rvol: 2.55, rsi: 73.5, adx: 22, wave: 0.045, rangeFrac: 0.048 },
  { ticker: 'HD', company: 'Home Depot', sectorId: 'consumer-discretionary', industry: 'Home improvement', marketCapB: 370, price: 396.2, growth: 1.27, avgVolumeM: 3.2, rvol: 0.95, rsi: 45.2, adx: 16, wave: 0.04, bend: -0.02, rangeFrac: 0.013, exchange: 'NYSE' },
  { ticker: 'COST', company: 'Costco', sectorId: 'consumer-staples', industry: 'Retail', marketCapB: 410, price: 912.3, growth: 1.78, avgVolumeM: 1.8, rvol: 0.9, rsi: 63, adx: 29, pinNearHigh: true, wave: 0.008, rangeFrac: 0.008 },
  { ticker: 'WMT', company: 'Walmart', sectorId: 'consumer-staples', industry: 'Retail', marketCapB: 670, price: 82.4, growth: 1.5, avgVolumeM: 16, rvol: 0.85, rsi: 59.1, adx: 24, rangeFrac: 0.009, exchange: 'NYSE' },
  { ticker: 'PG', company: 'Procter & Gamble', sectorId: 'consumer-staples', industry: 'Household products', marketCapB: 380, price: 168.15, growth: 1.14, avgVolumeM: 7, rvol: 0.66, rsi: 52.4, adx: 14, rangeFrac: 0.007, exchange: 'NYSE' },
  { ticker: 'KO', company: 'Coca-Cola', sectorId: 'consumer-staples', industry: 'Beverages', marketCapB: 290, price: 68.42, growth: 1.16, avgVolumeM: 14, rvol: 0.72, rsi: 48.6, adx: 16, rangeFrac: 0.007, exchange: 'NYSE' },
  { ticker: 'PEP', company: 'PepsiCo', sectorId: 'consumer-staples', industry: 'Beverages', marketCapB: 198, price: 152.3, growth: 1.1, avgVolumeM: 6, rvol: 0.8, rsi: 50.1, adx: 15, rangeFrac: 0.008, quality: 'stale', endDate: '2026-10-07' },
  { ticker: 'CAT', company: 'Caterpillar', sectorId: 'industrials', industry: 'Machinery', marketCapB: 210, price: 388.5, growth: 2.05, avgVolumeM: 3.1, rvol: 1.42, rsi: 66.2, adx: 36, rangeFrac: 0.018, exchange: 'NYSE' },
  { ticker: 'GE', company: 'GE Aerospace', sectorId: 'industrials', industry: 'Aerospace', marketCapB: 230, price: 188.7, growth: 1.6, avgVolumeM: 5, rvol: 1.2, rsi: 61, adx: 27, rangeFrac: 0.015, exchange: 'NYSE' },
  { ticker: 'RTX', company: 'RTX', sectorId: 'industrials', industry: 'Aerospace and defense', marketCapB: 175, price: 122.35, growth: 1.2, avgVolumeM: 6, rvol: 0.98, rsi: 44, adx: 18, wave: 0.03, rangeFrac: 0.013, exchange: 'NYSE' },
  { ticker: 'BA', company: 'Boeing', sectorId: 'industrials', industry: 'Aerospace and defense', marketCapB: 128, price: 156.8, growth: 0.7, avgVolumeM: 8, rvol: 1.7, rsi: 32.5, adx: 28, kind: 'peak', peak: 1.48, rangeFrac: 0.028, cmf: null, quality: 'partial', exchange: 'NYSE' },
  { ticker: 'XOM', company: 'Exxon Mobil', sectorId: 'energy', industry: 'Integrated oil', marketCapB: 490, price: 118.25, growth: 0.98, avgVolumeM: 18, rvol: 1.18, rsi: 53.2, adx: 20, rangeFrac: 0.018, exchange: 'NYSE' },
  { ticker: 'CVX', company: 'Chevron', sectorId: 'energy', industry: 'Integrated oil', marketCapB: 270, price: 148.6, growth: 0.9, avgVolumeM: 8, rvol: 1.05, rsi: 47.5, adx: 19, rangeFrac: 0.016, exchange: 'NYSE' },
  { ticker: 'NEE', company: 'NextEra Energy', sectorId: 'utilities', industry: 'Electric utilities', marketCapB: 152, price: 78.55, growth: 1.08, avgVolumeM: 9, rvol: 0.78, rsi: 42.3, adx: 16, rangeFrac: 0.009, exchange: 'NYSE' },
  { ticker: 'PLD', company: 'Prologis', sectorId: 'real-estate', industry: 'Industrial REITs', marketCapB: 112, price: 118.4, growth: 1.18, avgVolumeM: 3, rvol: 0.9, rsi: 55, adx: 19, rangeFrac: 0.011, exchange: 'NYSE' },
  { ticker: 'AMT', company: 'American Tower', sectorId: 'real-estate', industry: 'Tower REITs', marketCapB: 92, price: 214.2, growth: 0.96, avgVolumeM: 1.6, rvol: 0.86, rsi: 41.2, adx: 17, rangeFrac: 0.012, exchange: 'NYSE' },
  { ticker: 'SPG', company: 'Simon Property Group', sectorId: 'real-estate', industry: 'Retail REITs', marketCapB: 54, price: 168.05, growth: 1.12, avgVolumeM: 1.4, rvol: 1, rsi: 39.5, adx: 14, rangeFrac: 0.013, sessions: 100, quality: 'insufficient', exchange: 'NYSE' },
  { ticker: 'LIN', company: 'Linde', sectorId: 'materials', industry: 'Industrial gases', marketCapB: 215, price: 468.9, growth: 1.48, avgVolumeM: 1.9, rvol: 0.82, rsi: 58.8, adx: 23, rangeFrac: 0.01, exchange: 'NYSE' },
  { ticker: 'APD', company: 'Air Products', sectorId: 'materials', industry: 'Industrial gases', marketCapB: 68, price: 292.15, growth: 1.12, avgVolumeM: 1.1, rvol: 0.94, rsi: 43.6, adx: 16, wave: 0.02, rangeFrac: 0.012, exchange: 'NYSE' },
  { ticker: 'GOOGL', company: 'Alphabet', sectorId: 'communication-services', industry: 'Internet content', marketCapB: 2080, price: 168.95, growth: 2.02, avgVolumeM: 28, rvol: 1.06, rsi: 64.2, adx: 30, pinNearHigh: true, rangeFrac: 0.013 },
  { ticker: 'META', company: 'Meta Platforms', sectorId: 'communication-services', industry: 'Interactive media', marketCapB: 1520, price: 582.4, growth: 2.2, avgVolumeM: 15, rvol: 1.55, rsi: 69.4, adx: 33, pinNearHigh: true, rangeFrac: 0.018 },
  { ticker: 'DIS', company: 'Walt Disney', sectorId: 'communication-services', industry: 'Entertainment', marketCapB: 178, price: 96.35, growth: 0.84, avgVolumeM: 12, rvol: 1.12, rsi: 34.8, adx: 22, rangeFrac: 0.015, exchange: 'NYSE' },
];

export function exchangeFor(seed: StockSeed): 'NYSE' | 'NASDAQ' {
  if (seed.exchange) return seed.exchange;
  return NASDAQ.has(seed.ticker) ? 'NASDAQ' : 'NYSE';
}
