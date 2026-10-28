/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'mock' | 'snapshot';
  readonly VITE_DATA_SCHEMA_VERSION?: string;
  /** TradingView saved chart layout id, e.g. aLaCB4SB */
  readonly VITE_TRADINGVIEW_CHART_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
