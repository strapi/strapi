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

const formatDbPerfLogLine = (eventName: string, event: DatabaseQueryPerfEvent): string => {
  const payload: Record<string, unknown> = {
    durationMs: event.durationMs,
    dbClient: event.dbClient,
    queryType: event.queryType,
    queryFingerprint: event.queryFingerprint,
    requestId: event.requestId,
    success: event.success,
    errorCode: event.errorCode,
  };

  if (event.sql !== undefined) {
    payload.sql = event.sql;
  }

  if (event.bindings !== undefined) {
    payload.bindings = event.bindings;
  }

  return `${eventName} ${JSON.stringify(payload)}`;
};

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
      /* Winston pretty-print transports only stringify `message`, not metadata objects */
      logger.warn(formatDbPerfLogLine(eventName, event));
    }
  });
};
