import type { EventLoopDelay } from './event-loop';

export const POOL_TIMEOUT_CODE = 'DB_POOL_ACQUIRE_TIMEOUT';

export interface PoolState {
  used: number;
  free: number;
  pendingAcquires: number;
  pendingCreates: number;
  min?: number;
  max?: number;
}

export interface PoolTimeoutDetails {
  code: typeof POOL_TIMEOUT_CODE;
  /** How long this caller waited before knex gave up. */
  waitedMs: number;
  /** The timeout knex applied: the smaller of acquireConnectionTimeout and pool.acquireTimeoutMillis. */
  acquireTimeoutMs?: number;
  /** As configured, when set. */
  acquireConnectionTimeout?: number;
  poolAcquireTimeoutMillis?: number;
  /** Pool counts at the moment of the timeout. */
  pool?: PoolState;
  /** tarn's message: the error of a failed connection attempt, or "operation timed out for an unknown reason". */
  poolReason?: string;
  eventLoopDelay?: EventLoopDelay;
  phase?: string;
  hostname: string;
  pid: number;
}

export interface TarnPoolLike {
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  numUsed(): number;
  numFree(): number;
  numPendingAcquires(): number;
  numPendingCreates(): number;
}

export interface KnexClientLike {
  config?: { acquireConnectionTimeout?: unknown; pool?: { acquireTimeoutMillis?: unknown } };
  /** A tarn pool, or knex's wrapper around a native driver pool, which has no counters. */
  pool?: Partial<TarnPoolLike> | null;
}

export interface CollectInput {
  waitedMs: number;
  cause: unknown;
  eventLoopDelay?: EventLoopDelay;
  phase?: string;
  hostname: string;
  pid: number;
}

const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const hasCounters = (pool: Partial<TarnPoolLike>): pool is TarnPoolLike =>
  typeof pool.numUsed === 'function' &&
  typeof pool.numFree === 'function' &&
  typeof pool.numPendingAcquires === 'function' &&
  typeof pool.numPendingCreates === 'function';

export const readPoolState = (
  pool: Partial<TarnPoolLike> | null | undefined
): PoolState | undefined => {
  // knex also accepts a pool that only has acquire, release and destroy
  if (!pool || !hasCounters(pool)) {
    return undefined;
  }

  return {
    used: pool.numUsed(),
    free: pool.numFree(),
    pendingAcquires: pool.numPendingAcquires(),
    pendingCreates: pool.numPendingCreates(),
    min: asNumber(pool.min),
    max: asNumber(pool.max),
  };
};

export const collectPoolTimeoutDetails = (
  client: KnexClientLike,
  input: CollectInput
): PoolTimeoutDetails => {
  const config = client.config ?? {};

  return {
    code: POOL_TIMEOUT_CODE,
    waitedMs: input.waitedMs,
    // knex writes the effective (smaller) timeout into the tarn pool options
    acquireTimeoutMs: asNumber(client.pool?.acquireTimeoutMillis),
    acquireConnectionTimeout: asNumber(config.acquireConnectionTimeout),
    poolAcquireTimeoutMillis: asNumber(config.pool?.acquireTimeoutMillis),
    pool: readPoolState(client.pool),
    // knex 3.3 keeps tarn's error as `cause`; its message is all tarn keeps of a failed attempt
    poolReason: input.cause instanceof Error ? input.cause.message : undefined,
    eventLoopDelay: input.eventLoopDelay,
    phase: input.phase,
    hostname: input.hostname,
    pid: input.pid,
  };
};
