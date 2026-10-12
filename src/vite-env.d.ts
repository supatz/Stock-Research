/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'mock' | 'snapshot';
  readonly VITE_DATA_SCHEMA_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
