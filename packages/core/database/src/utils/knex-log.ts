import type { Knex } from 'knex';

import { createThrottle } from './throttle';

/** knex 3.3 logs this, with a stack, on every failed connection acquire. */
export const KNEX_ACQUIRE_ERROR_PREFIX = 'Acquire connection error:';

const KNEX_WARNING_INTERVAL_MS = 30_000;

interface WarnLogger {
  warn(message: string): void;
}

export interface KnexWarnOptions {
  intervalMs?: number;
  now?: () => number;
}

/**
 * During pool exhaustion knex warns once per waiting query. Keep the first acquire warning and at
 * most one per interval after it; pass every other knex warning through.
 */
export const createKnexWarn = (
  logger: WarnLogger,
  { intervalMs = KNEX_WARNING_INTERVAL_MS, now }: KnexWarnOptions = {}
) => {
  const acquireErrors = createThrottle({ intervalMs, now });

  return (message: unknown) => {
    const text = typeof message === 'string' ? message : String(message);

    if (!text.startsWith(KNEX_ACQUIRE_ERROR_PREFIX)) {
      logger.warn(`[database] knex: ${text}`);
      return;
    }

    const { emit, suppressed } = acquireErrors.take();
    if (!emit) {
      return;
    }

    const held =
      suppressed > 0
        ? `\n  - similar knex warnings not logged since the previous one: ${suppressed}`
        : '';
    logger.warn(`[database] knex: ${text}${held}`);
  };
};

/** Route knex's warnings through the Strapi logger unless the project configured its own. */
export const withStrapiKnexLog = (
  config: Knex.Config,
  logger: WarnLogger,
  options?: KnexWarnOptions
): Knex.Config => {
  const projectLog = config.log ?? {};

  if (typeof projectLog.warn === 'function') {
    return config;
  }

  return { ...config, log: { ...projectLog, warn: createKnexWarn(logger, options) } };
};
