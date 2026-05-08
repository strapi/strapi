import type { Database, DatabaseQueryPerfEvent } from '@strapi/database';
import type { Logger } from '@strapi/logger';
import type { Modules } from '@strapi/types';

interface PerformanceBridgeOptions {
  db: Database;
  eventHub: Modules.EventHub.EventHub;
  logger: Logger;
  output?: 'none' | 'log' | 'artifact' | 'both';
}

const DB_SLOW_EVENT = 'performance.db.query.slow';
const DB_ERROR_EVENT = 'performance.db.query.error';

const shouldLog = (output?: string) => output === 'log' || output === 'both';

export const bridgeDatabasePerformanceEvents = ({
  db,
  eventHub,
  logger,
  output = 'none',
}: PerformanceBridgeOptions) => {
  return db.subscribeToPerformanceEvents((event: DatabaseQueryPerfEvent) => {
    const eventName = event.type === 'query.error' ? DB_ERROR_EVENT : DB_SLOW_EVENT;
    eventHub.emit(eventName, event).catch(() => {
      /* fail-open — perf bridge must never break callers */
    });

    if (shouldLog(output)) {
      logger.warn({
        event: eventName,
        durationMs: event.durationMs,
        dbClient: event.dbClient,
        queryType: event.queryType,
        queryFingerprint: event.queryFingerprint,
        requestId: event.requestId,
        success: event.success,
        errorCode: event.errorCode,
      });
    }
  });
};
