import type { PoolTimeoutDetails } from './details';

/** Where the error and the warning point readers. The only place the URL lives. */
export const POOL_TIMEOUT_DOCS_URL =
  'https://docs.strapi.io/cms/configurations/database#connection-pool-timeouts';

export const appendDocsLink = (message: string): string =>
  message.includes(POOL_TIMEOUT_DOCS_URL) ? message : `${message} See ${POOL_TIMEOUT_DOCS_URL}.`;

const valueOrUnknown = (value: number | undefined) =>
  value === undefined ? 'unknown' : String(value);

/** Facts only, one bullet per fact, in the house style of multi-line warnings. */
export const formatPoolTimeoutWarning = (
  details: PoolTimeoutDetails,
  { suppressed }: { suppressed: number }
): string => {
  const lines = [
    `[database] connection pool timeout: waited ${details.waitedMs} ms for a connection (acquire timeout ${valueOrUnknown(details.acquireTimeoutMs)} ms)`,
  ];

  if (details.pool) {
    const { used, free, max, min, pendingAcquires, pendingCreates } = details.pool;
    lines.push(
      `  - connections: ${used} in use, ${free} free, max ${valueOrUnknown(max)}, min ${valueOrUnknown(min)}`
    );
    lines.push(
      `  - waiting for a connection: ${pendingAcquires}, connections being opened: ${pendingCreates}`
    );
  } else {
    lines.push('  - connections: the pool is not initialized');
  }

  if (
    details.acquireConnectionTimeout !== undefined &&
    details.poolAcquireTimeoutMillis !== undefined
  ) {
    lines.push(
      `  - timeout settings: acquireConnectionTimeout ${details.acquireConnectionTimeout}, pool.acquireTimeoutMillis ${details.poolAcquireTimeoutMillis} (knex applies the smaller)`
    );
  }

  lines.push(`  - reason reported by the pool: ${details.poolReason ?? 'not available'}`);

  if (details.eventLoopDelay) {
    const { maxMs, p99Ms, windowMs } = details.eventLoopDelay;
    lines.push(
      `  - event loop delay over the last ${Math.round(windowMs / 1000)} s: max ${maxMs} ms, p99 ${p99Ms} ms`
    );
  }

  const where = [
    details.phase ? `phase ${details.phase}` : undefined,
    `host ${details.hostname}`,
    `pid ${details.pid}`,
  ]
    .filter(Boolean)
    .join(', ');
  lines.push(`  - ${where}`);

  if (suppressed > 0) {
    lines.push(`  - pool timeouts since the previous report: ${suppressed}`);
  }

  lines.push(`See ${POOL_TIMEOUT_DOCS_URL}.`);

  return lines.join('\n');
};
