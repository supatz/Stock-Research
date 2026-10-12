import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createStockDataProvider } from '@/data/providers/createProvider';
import type { StockDataProvider } from '@/data/providers/StockDataProvider';
import { readWatchlist, writeWatchlist } from '@/features/watchlist/storage';

type ThemeName = 'light' | 'dark';

const ThemeContext = createContext<{ theme: ThemeName; toggleTheme: () => void } | null>(null);
const ToastContext = createContext<{ pushToast: (message: string) => void } | null>(null);
const WatchlistContext = createContext<{
  tickers: string[];
  addTicker: (ticker: string) => boolean;
  removeTicker: (ticker: string) => void;
  hasTicker: (ticker: string) => boolean;
} | null>(null);
const DataContext = createContext<StockDataProvider | null>(null);

function initialTheme(): ThemeName {
  const current = document.documentElement.getAttribute('data-theme');
  return current === 'dark' ? 'dark' : 'light';
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);
  const [tickers, setTickers] = useState<string[]>(() => readWatchlist());
  const toastId = useRef(0);
  const timers = useRef<number[]>([]);
  const provider = useMemo(() => createStockDataProvider(), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('meridian.theme', theme);
  }, [theme]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const pushToast = useCallback((message: string) => {
    const id = toastId.current + 1;
    toastId.current = id;
    setToasts((current) => [...current, { id, message }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
    timers.current.push(timer);
  }, []);

  const addTicker = useCallback((ticker: string) => {
    const normalized = ticker.toUpperCase();
    let added = false;
    setTickers((current) => {
      if (current.includes(normalized)) return current;
      added = true;
      const next = [...current, normalized];
      writeWatchlist(next);
      return next;
    });
    return added;
  }, []);

  const removeTicker = useCallback((ticker: string) => {
    const normalized = ticker.toUpperCase();
    setTickers((current) => {
      const next = current.filter((item) => item !== normalized);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const hasTicker = useCallback((ticker: string) => tickers.includes(ticker.toUpperCase()), [tickers]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <DataContext.Provider value={provider}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <ToastContext.Provider value={{ pushToast }}>
          <WatchlistContext.Provider value={{ tickers, addTicker, removeTicker, hasTicker }}>
            {children}
            <div className="toast-region" aria-live="polite" aria-relevant="additions">
              {toasts.map((toast) => (
                <div className="toast" key={toast.id} role="status">
                  {toast.message}
                </div>
              ))}
            </div>
          </WatchlistContext.Provider>
        </ToastContext.Provider>
      </ThemeContext.Provider>
    </DataContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('Theme provider is missing');
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('Toast provider is missing');
  return value;
}

export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) throw new Error('Watchlist provider is missing');
  return value;
}

export function useStockDataProvider() {
  const value = useContext(DataContext);
  if (!value) throw new Error('Stock data provider is missing');
  return value;
}
