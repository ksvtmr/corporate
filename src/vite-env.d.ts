/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_BASE_URL?: string;
  /** 'development' | 'preview' | 'production' — set by the deployment pipeline. */
  readonly VITE_DEPLOY_ENV?: string;
  /** Commit SHA of the build (set by CI; "dev" locally). */
  readonly VITE_APP_VERSION?: string;
  /** Prefix for browser storage keys; isolates preview deployments from production. */
  readonly VITE_STORAGE_NAMESPACE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
