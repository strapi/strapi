/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The origin of the Strapi application (examples/end-users). */
  readonly VITE_STRAPI_URL?: string;
  /** `cookie` (default) or `bearer`. A `?mode=` query parameter overrides it. */
  readonly VITE_AUTH_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
