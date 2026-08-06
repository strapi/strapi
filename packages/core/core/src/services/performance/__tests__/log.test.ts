import { formatStrapiPerformanceHubLogRecord, STRAPI_PERF_LOG_SCHEMA_VERSION } from '../log';
import { PERFORMANCE_HUB_EVENT } from '../hub-events';

describe('formatStrapiPerformanceHubLogRecord', () => {
  it('emits a single JSON object with stable strapiPerfLog envelope', () => {
    const payload = { schemaVersion: 1, durationMs: 5 };
    const line = formatStrapiPerformanceHubLogRecord(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, payload);
    const parsed = JSON.parse(line);

    expect(parsed).toEqual({
      strapiPerfLog: {
        schemaVersion: STRAPI_PERF_LOG_SCHEMA_VERSION,
        event: PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
        payload,
      },
    });
  });
});
