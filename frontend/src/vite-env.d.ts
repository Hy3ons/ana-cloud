/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DOMAIN?: string;
  readonly DOMAIN?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
