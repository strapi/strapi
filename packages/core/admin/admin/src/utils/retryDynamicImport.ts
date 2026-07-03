import type { RouteObject } from 'react-router-dom';

/**
 * Detects failures when the browser cannot load a code-split chunk (dynamic `import()`).
 * Common when the host is cold, the connection drops, or a deploy replaced hashed assets.
 */
const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError/i;

export function isChunkLoadError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (typeof error === 'string') {
    return CHUNK_LOAD_ERROR_RE.test(error);
  }

  if (error instanceof Error) {
    if (error.name === 'ChunkLoadError') {
      return true;
    }

    return CHUNK_LOAD_ERROR_RE.test(error.message);
  }

  if (
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return CHUNK_LOAD_ERROR_RE.test((error as { message: string }).message);
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface RetryDynamicImportOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryDynamicImportOptions> = {
  maxAttempts: 6,
  initialDelayMs: 400,
  maxDelayMs: 4500,
};

/**
 * Retries transient chunk loads so the route stays in Suspense (loading) instead of erroring.
 * Does not fix a permanent 404 for a stale chunk after deploy — {@link isChunkLoadError} still
 * surfaces; use {@link ErrorElement} reload for that case.
 */
export async function retryDynamicImport<T>(
  importer: () => Promise<T>,
  options: RetryDynamicImportOptions = {}
): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await importer();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt || !isChunkLoadError(error)) {
        throw error;
      }

      const exponential = Math.min(maxDelayMs, initialDelayMs * 2 ** attempt);
      const jitter = Math.random() * 200;

      await sleep(exponential + jitter);
    }
  }

  throw lastError;
}

/**
 * Wraps every `lazy` loader on the route tree so transient chunk failures retry while
 * React Router keeps the route in a loading (Suspense) state.
 */
export function wrapRouteObjectLazyWithRetry(route: RouteObject): RouteObject {
  const next: RouteObject = { ...route };

  if (route.lazy) {
    const originalLazy = route.lazy;
    next.lazy = () => retryDynamicImport(() => originalLazy());
  }

  if (route.children) {
    next.children = route.children.map(wrapRouteObjectLazyWithRetry);
  }

  return next;
}

export function wrapRouteObjectsLazyWithRetry(routes: RouteObject[]): RouteObject[] {
  return routes.map(wrapRouteObjectLazyWithRetry);
}
