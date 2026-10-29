import type { Core } from '@strapi/types';

import { buildPerformanceHomeMetrics } from '../performance-metrics';
import { readPerformanceArtifactContext } from '../performance-snapshot';

jest.mock('../performance-snapshot', () => ({
  ...jest.requireActual('../performance-snapshot'),
  readPerformanceArtifactContext: jest.fn(),
}));

const mockedReadContext = jest.mocked(readPerformanceArtifactContext);

function minimalStrapi(config: Record<string, unknown> = {}): Core.Strapi {
  return {
    config: {
      get(key: string, def?: unknown) {
        return Object.hasOwn(config, key) ? config[key] : def;
      },
    },
  } as Core.Strapi;
}

describe('buildPerformanceHomeMetrics', () => {
  beforeEach(() => {
    mockedReadContext.mockReset();
  });

  it('returns none source when artifact context is unavailable', async () => {
    mockedReadContext.mockResolvedValue({
      ok: false,
      source: 'none',
      hint: 'Enable artifact output',
      databasePerformanceEnabled: true,
      requestTimelineEnabled: false,
    });

    const result = await buildPerformanceHomeMetrics(minimalStrapi());

    expect(result.source).toBe('none');
    if (result.source !== 'none') {
      throw new Error('expected none');
    }
    expect(result.hint).toBe('Enable artifact output');
    expect(result.databasePerformanceEnabled).toBe(true);
    expect(result.requestTimelineEnabled).toBe(false);
  });

  it('aggregates request summaries and slow DB events from artifact lines', async () => {
    mockedReadContext.mockResolvedValue({
      ok: true,
      source: 'artifact',
      resolvedPath: '/tmp/performance.jsonl',
      lines: [
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-05-01T12:00:00.000Z',
          events: [
            {
              kind: 'performance.request.summary',
              event: {
                durationMs: 200,
                dbTotalMs: 50,
                method: 'GET',
                route: '/api/a',
                slowQueryCount: 1,
              },
            },
            {
              kind: 'performance.db.query.slow',
              event: { queryFingerprint: 'fp1', durationMs: 80 },
            },
          ],
        }),
        JSON.stringify({
          schemaVersion: 1,
          generatedAt: '2026-05-01T12:01:00.000Z',
          events: [
            {
              kind: 'performance.request.summary',
              event: {
                durationMs: 100,
                dbTotalMs: 0,
                method: 'POST',
                route: '/api/b',
                slowQueryCount: 0,
              },
            },
          ],
        }),
      ],
      databasePerformanceEnabled: true,
      requestTimelineEnabled: true,
    });

    const result = await buildPerformanceHomeMetrics(minimalStrapi());

    expect(result.source).toBe('artifact');
    if (result.source !== 'artifact') {
      throw new Error('expected artifact');
    }
    expect(result.fileFound).toBe(true);
    expect(result.batchesParsed).toBe(2);
    expect(result.quickStats.requestSummariesInWindow).toBe(2);
    expect(result.quickStats.avgRequestDurationMs).toBe(150);
    expect(result.quickStats.slowDbEventsInWindow).toBe(1);
    expect(result.quickStats.slowOrErrorQueriesAttributedToRequests).toBe(1);
    expect(result.topSqlFingerprints[0]).toMatchObject({
      fingerprint: 'fp1',
      count: 1,
      totalMs: 80,
    });
    const getRoute = result.slowestRoutes.find((r) => r.route === '/api/a');
    expect(getRoute).toMatchObject({
      method: 'GET',
      count: 1,
      avgDurationMs: 200,
    });
  });

  it('skips malformed JSON lines without failing the batch', async () => {
    mockedReadContext.mockResolvedValue({
      ok: true,
      source: 'artifact',
      resolvedPath: '/tmp/performance.jsonl',
      lines: ['not-json', '{'],
      databasePerformanceEnabled: false,
      requestTimelineEnabled: false,
    });

    const result = await buildPerformanceHomeMetrics(minimalStrapi());

    expect(result.source).toBe('artifact');
    if (result.source !== 'artifact') {
      throw new Error('expected artifact');
    }
    expect(result.batchesParsed).toBe(0);
    expect(result.quickStats.requestSummariesInWindow).toBe(0);
  });
});
