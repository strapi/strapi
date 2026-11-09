import type { Database, DatabaseQueryPerfEvent } from '@strapi/database';
import type { Logger } from '@strapi/logger';
import type { Modules } from '@strapi/types';

import { buildPublicDatabaseQueryPerformancePayload } from './event-payloads';
import { PERFORMANCE_HUB_EVENT } from './hub-events';
import { formatStrapiPerformanceHubLogRecord } from './log';

interface PerformanceBridgeOptions {
  db: Database;
  eventHub: Modules.EventHub.EventHub;
  logger: Logger;
  output?: 'none' | 'log' | 'artifact' | 'both';
}

const shouldLog = (output?: string) => output === 'log' || output === 'both';

export const bridgeDatabasePerformanceEvents = ({
  db,
  eventHub,
  logger,
  output = 'none',
}: PerformanceBridgeOptions) => {
  return db.subscribeToPerformanceEvents((event: DatabaseQueryPerfEvent) => {
    const eventName =
      event.type === 'query.error'
        ? PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR
        : PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW;
    const payload = buildPublicDatabaseQueryPerformancePayload(eventName, event);

    eventHub.emit(eventName, payload).catch(() => {
      /* fail-open — perf bridge must never break callers */
    });

    if (shouldLog(output)) {
      /* Winston pretty-print transports only stringify `message`, not metadata objects */
      const line = formatStrapiPerformanceHubLogRecord(eventName, payload);
      // Slow queries are observability signals (like request summaries); only failed queries use warn.
      if (event.type === 'query.error') {
        logger.warn(line);
      } else {
        logger.debug(line);
      }
    }
  });
};
