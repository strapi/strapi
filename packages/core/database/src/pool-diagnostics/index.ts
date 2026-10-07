import os from 'node:os';
import { performance } from 'node:perf_hooks';
import type { Knex } from 'knex';

import { createThrottle } from '../utils/throttle';
import { collectPoolTimeoutDetails, POOL_TIMEOUT_CODE, type KnexClientLike } from './details';
import { createEventLoopMonitor, type EventLoopMonitor } from './event-loop';
import { appendDocsLink, formatPoolTimeoutWarning } from './format';
import { deepenStack } from './stack';

export { POOL_TIMEOUT_CODE } from './details';
export type { PoolState, PoolTimeoutDetails } from './details';
export { POOL_TIMEOUT_DOCS_URL } from './format';

const ACQUIRE_TIMEOUT_PREFIX = 'Knex: Timeout acquiring a connection';
const WARNING_INTERVAL_MS = 30_000;

interface DiagnosableClient extends KnexClientLike {
  acquireConnection(): Promise<unknown>;
}

export interface PoolDiagnosticsOptions {
  logger: { warn(message: string): void };
  getPhase?: () => string | undefined;
  now?: () => number;
  hostname?: string;
  pid?: number;
  intervalMs?: number;
  /** Injected in tests; null turns the event loop measurement off. */
  eventLoopMonitor?: EventLoopMonitor | null;
}

export interface PoolDiagnostics {
  dispose(): void;
}

/** knex also uses KnexTimeoutError for query timeouts; only pool acquire timeouts are described. */
export const isPoolAcquireTimeout = (error: unknown): error is Error =>
  error instanceof Error &&
  error.name === 'KnexTimeoutError' &&
  error.message.startsWith(ACQUIRE_TIMEOUT_PREFIX);

/** An earlier install (for example another copy of this package) already described this error. */
const isDescribed = (error: Error) =>
  (error as { details?: { code?: unknown } | null }).details?.code === POOL_TIMEOUT_CODE;

const replaceMessage = (error: Error, message: string) => {
  const previous = error.message;
  error.message = message;

  // V8 builds `stack` lazily; once something has read it, its first line keeps the old text
  if (typeof error.stack === 'string' && !error.stack.includes(message)) {
    error.stack = error.stack.replace(previous, () => message);
  }
};

/**
 * Wraps acquireConnection on the knex client Strapi created. On a pool acquire timeout, the same
 * error object gets a deeper stack, a docs link and `details`; at most one warning block per
 * interval goes to the logger. Facts are collected before the error is changed, so a failure while
 * collecting leaves the error's class, name and message as knex made them (its stack may already be
 * deeper); a failing logger only loses the warning. An error that already carries `details` from
 * an earlier install is passed through.
 */
export const installPoolDiagnostics = (
  knex: Knex,
  options: PoolDiagnosticsOptions
): PoolDiagnostics => {
  const client = knex.client as unknown as DiagnosableClient;
  // Monotonic: a wall clock step must not distort waitedMs or the throttle
  const now = options.now ?? (() => performance.now());
  const hostname = options.hostname ?? os.hostname();
  const pid = options.pid ?? process.pid;
  const throttle = createThrottle({ intervalMs: options.intervalMs ?? WARNING_INTERVAL_MS, now });
  const eventLoop =
    options.eventLoopMonitor === undefined
      ? createEventLoopMonitor({ now })
      : options.eventLoopMonitor;

  const safePhase = () => {
    try {
      return options.getPhase?.();
    } catch {
      return undefined;
    }
  };

  const describeTimeout = (error: Error, waitedMs: number) => {
    try {
      const details = collectPoolTimeoutDetails(client, {
        waitedMs,
        cause: (error as { cause?: unknown }).cause,
        eventLoopDelay: eventLoop?.read(),
        phase: safePhase(),
        hostname,
        pid,
      });
      const message = appendDocsLink(error.message);
      const { emit, suppressed } = throttle.take();
      const warning = emit ? formatPoolTimeoutWarning(details, { suppressed }) : undefined;

      // Everything that can throw has run; only now change the error
      replaceMessage(error, message);
      Object.assign(error, { details });

      if (warning) {
        options.logger.warn(warning);
      }
    } catch {
      // Diagnostics never change the failure itself
    }
  };

  const hadOwn = Object.prototype.hasOwnProperty.call(client, 'acquireConnection');
  const original = client.acquireConnection;

  client.acquireConnection = async function acquireConnectionWithDiagnostics(
    this: DiagnosableClient
  ) {
    const startedAt = now();

    try {
      return await original.call(this);
    } catch (error) {
      // An outer second install must not overwrite `details` or log a second block
      if (isPoolAcquireTimeout(error) && !isDescribed(error)) {
        try {
          // Called here so this function is the first re-captured frame
          deepenStack(error);
        } catch {
          // keep knex's stack
        }
        describeTimeout(error, now() - startedAt);
      }

      throw error;
    }
  };

  return {
    dispose() {
      if (hadOwn) {
        client.acquireConnection = original;
      } else {
        delete (client as Partial<DiagnosableClient>).acquireConnection;
      }
      eventLoop?.stop();
    },
  };
};
