import type { PoolTimeoutDetails } from './details';

/** Where the error and the warning point readers. The only place the URL lives. */
export const POOL_TIMEOUT_DOCS_URL =
  'https://docs.strapi.io/cms/configurations/database#connection-pool-timeouts';

export const appendDocsLink = (message: string): string =>
  message.includes(POOL_TIMEOUT_DOCS_URL) ? message : `${message} See ${POOL_TIMEOUT_DOCS_URL}.`;

const valueOrUnknown = (value: number | undefined) =>
  value === undefined ? 'unknown' : String(value);

// driver errors and labels can span lines; keep each to one bullet
const singleLine = (text: string | undefined) => text?.replace(/\s+/g, ' ').trim();

/** Facts only, one bullet per fact, in the house style of multi-line warnings. */
export const formatPoolTimeoutWarning = (
  details: PoolTimeoutDetails,
  { suppressed }: { suppressed: number }
): string => {
  const lines = [
    `[database] connection pool timeout: waited ${Math.round(details.waitedMs)} ms for a connection (acquire timeout ${valueOrUnknown(details.acquireTimeoutMs)} ms)`,
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
    // a timeout implies a pool exists, so this is a pool without tarn counters
    lines.push('  - connections: pool counters not available');
  }

  if (
    details.acquireConnectionTimeout !== undefined &&
    details.poolAcquireTimeoutMillis !== undefined
  ) {
    lines.push(
      `  - timeout settings: acquireConnectionTimeout ${details.acquireConnectionTimeout}, pool.acquireTimeoutMillis ${details.poolAcquireTimeoutMillis} (knex applies the smaller)`
    );
  }

  const reason = singleLine(details.poolReason);
  lines.push(`  - reason reported by the pool: ${reason || 'not available'}`);

  if (details.eventLoopDelay) {
    const { maxMs, p99Ms, windowMs } = details.eventLoopDelay;
    lines.push(
      `  - event loop delay over the last ${Math.round(windowMs / 1000)} s: max ${Math.round(maxMs)} ms, p99 ${Math.round(p99Ms)} ms`
    );
  }

  const phase = singleLine(details.phase);
  const where = [
    phase ? `phase ${phase}` : undefined,
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
