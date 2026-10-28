/**
 * A single cache record returned by providers and the cache manager.
 */
export interface CacheEntry {
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
}

export interface CacheGetOptions {
  /** Use this provider instead of the configured default */
  provider?: string;
}

export interface CacheSetOptions extends CacheGetOptions {
  /** When set, entry is treated as expired after this time */
  expiresAt?: Date | null;
}

/**
 * Low-level storage backend (memory, database, Redis, etc.)
 */
export interface CacheProvider {
  get(namespace: string, key: string): Promise<CacheEntry | null>;
  set(
    namespace: string,
    key: string,
    value: unknown,
    options?: Pick<CacheSetOptions, 'expiresAt'>
  ): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
}

/**
 * Minimal Strapi surface required by built-in cache providers.
 * Pass the full Strapi application instance from core.
 */
export interface CacheProviderStrapiContext {
  db: import('@strapi/database').Database;
  config: { get: (path: string, defaultVal?: unknown) => unknown };
}

export type CacheProviderFactory = (context: {
  strapi: CacheProviderStrapiContext;
  /** Merged from `server.cache.providers.<name>` */
  options?: Record<string, unknown>;
}) => CacheProvider;

/**
 * Plugins register additional cache backends here during `register()`.
 */
export interface CacheProviderRegistry {
  register(name: string, factory: CacheProviderFactory): void;
  has(name: string): boolean;
  get(name: string): CacheProviderFactory | undefined;
  getRegisteredNames(): string[];
}

/**
 * Application-facing cache API (uses default provider unless overridden per call).
 */
export interface CacheManagerService {
  get(namespace: string, key: string, options?: CacheGetOptions): Promise<CacheEntry | null>;
  set(namespace: string, key: string, value: unknown, options?: CacheSetOptions): Promise<void>;
  delete(namespace: string, key: string, options?: CacheGetOptions): Promise<void>;
}

/**
 * Synchronous view of the process-local memory cache (same backing store as the `memory` provider).
 * Registered on the Strapi instance by the core caching provider; use only where `await cacheManager` is not possible.
 */
export interface MemoryCacheSyncService {
  get(namespace: string, key: string): CacheEntry | null;
  set(
    namespace: string,
    key: string,
    value: unknown,
    options?: Pick<CacheSetOptions, 'expiresAt'>
  ): void;
  delete(namespace: string, key: string): void;
}
