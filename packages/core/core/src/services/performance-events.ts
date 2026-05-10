import type { Database, DatabaseQueryPerfEvent } from '@strapi/database';
import type { Logger } from '@strapi/logger';
import type { Modules } from '@strapi/types';

import { buildPublicDatabaseQueryPerformancePayload } from './performance-event-payloads';

interface PerformanceBridgeOptions {
  db: Database;
  eventHub: Modules.EventHub.EventHub;
  logger: Logger;
  output?: 'none' | 'log' | 'artifact' | 'both';
}

const DB_SLOW_EVENT = 'performance.db.query.slow' as const;
const DB_ERROR_EVENT = 'performance.db.query.error' as const;

const shouldLog = (output?: string) => output === 'log' || output === 'both';

export const bridgeDatabasePerformanceEvents = ({
  db,
  eventHub,
  logger,
  output = 'none',
}: PerformanceBridgeOptions) => {
  return db.subscribeToPerformanceEvents((event: DatabaseQueryPerfEvent) => {
    const eventName = event.type === 'query.error' ? DB_ERROR_EVENT : DB_SLOW_EVENT;
    const payload = buildPublicDatabaseQueryPerformancePayload(eventName, event);

    eventHub.emit(eventName, payload).catch(() => {
      /* fail-open — perf bridge must never break callers */
    });

    if (shouldLog(output)) {
      /* Winston pretty-print transports only stringify `message`, not metadata objects */
      logger.warn(`${eventName} ${JSON.stringify(payload)}`);
    }
  });
};
