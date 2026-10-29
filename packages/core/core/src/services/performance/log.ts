/**
 * Stable JSON log envelope for `database.performance` hub events when `output` is `log` or `both`.
 * Log pipelines can filter on `strapiPerfLog.schemaVersion` and `strapiPerfLog.event`.
 *
 * Emission levels (see `events.ts`): **`query.slow` → `debug`**, **`query.error` → `warn`** — only
 * slow/error rows are logged here (not every query).
 */
export const STRAPI_PERF_LOG_SCHEMA_VERSION = 1 as const;

export type StrapiPerfLogRecord = {
  strapiPerfLog: {
    schemaVersion: typeof STRAPI_PERF_LOG_SCHEMA_VERSION;
    event: string;
    payload: unknown;
  };
};

export function formatStrapiPerformanceHubLogRecord(event: string, payload: unknown): string {
  const record: StrapiPerfLogRecord = {
    strapiPerfLog: {
      schemaVersion: STRAPI_PERF_LOG_SCHEMA_VERSION,
      event,
      payload,
    },
  };
  return JSON.stringify(record);
}
