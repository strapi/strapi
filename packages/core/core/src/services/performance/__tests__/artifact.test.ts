import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import createEventHub from '../../event-hub';
import {
  attachPerformanceArtifactWriter,
  PERFORMANCE_ARTIFACT_BATCH_SCHEMA_VERSION,
  summarizePerfArtifactBatch,
} from '../artifact';
import { PERFORMANCE_HUB_EVENT } from '../hub-events';

describe('Performance artifact writer', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'strapi-perf-artifact-'));
    artifactPath = path.join(tmpDir, 'performance-artifact.jsonl');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function mockStrapi(configOverrides: Record<string, unknown> = {}) {
    const defaults: Record<string, unknown> = {
      'database.performance.output': 'artifact',
      'database.performance.artifactPath': artifactPath,
      'database.performance.flushIntervalMs': 120_000,
      'database.performance.maxEvents': 100,
      'server.performance.slowRequestMs': 500,
      'info.strapi': '9.9.9-test',
    };

    return {
      config: {
        get(key: string, def?: unknown) {
          if (key in configOverrides) {
            return configOverrides[key];
          }
          if (key in defaults) {
            return defaults[key];
          }
          return def;
        },
      },
      eventHub: createEventHub(),
    };
  }

  it('writes buffered events when disposed', async () => {
    const strapi = mockStrapi() as any;

    const dispose = attachPerformanceArtifactWriter(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, {
      type: 'query.slow',
      timestamp: '2020-01-01T00:00:00.000Z',
      durationMs: 120,
      dbClient: 'postgres',
      queryFingerprint: 'fp-a',
      queryType: 'select',
      success: true,
    });

    await dispose();

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);

    expect(doc.schemaVersion).toBe(PERFORMANCE_ARTIFACT_BATCH_SCHEMA_VERSION);
    expect(doc.generatedAt).toEqual(expect.any(String));
    expect(doc.strapiVersion).toBe('9.9.9-test');
    expect(doc.nodeVersion).toEqual(expect.any(String));
    expect(doc.config).toEqual(expect.objectContaining({ database: {}, server: {} }));
    expect(doc.summary).toMatchObject({
      totalQueriesObserved: 1,
      slowQueryCount: 1,
      p50Ms: 120,
      topFingerprints: [{ fingerprint: 'fp-a', count: 1, totalMs: 120 }],
    });
    expect(doc.events).toHaveLength(1);
    expect(doc.events[0].kind).toBe(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW);
    expect(doc.events[0].event).toMatchObject({ type: 'query.slow' });
  });

  it('does not write files when artifact output is disabled', async () => {
    const strapi = mockStrapi({
      'database.performance.output': 'log',
    }) as any;

    const dispose = attachPerformanceArtifactWriter(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, { type: 'query.slow' });
    await dispose();

    await expect(readFile(artifactPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('respects maxEvents as a rolling cap (preferred key)', async () => {
    const strapi = mockStrapi({
      'database.performance.maxEvents': 2,
    }) as any;

    const dispose = attachPerformanceArtifactWriter(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, { id: '1', durationMs: 1 });
    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, { id: '2', durationMs: 2 });
    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR, { id: '3', durationMs: 3 });

    await dispose();

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);

    expect(doc.events).toHaveLength(2);
    expect(doc.events[0].event).toMatchObject({ id: '2' });
    expect(doc.events[1].event).toMatchObject({ id: '3' });
  });

  it('rotates the artifact file when it exceeds artifactMaxFileBytes before append', async () => {
    const filler = 'x'.repeat(120);
    await writeFile(artifactPath, filler, 'utf8');

    const strapi = mockStrapi({
      'database.performance.artifactMaxFileBytes': 100,
    }) as any;

    const dispose = attachPerformanceArtifactWriter(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, {
      type: 'query.slow',
      timestamp: '2020-01-01T00:00:00.000Z',
      durationMs: 5,
      dbClient: 'postgres',
      queryFingerprint: 'fp-rot',
      queryType: 'select',
      success: true,
    });

    await dispose();

    const names = (await readdir(tmpDir)).sort();
    expect(names.some((n) => n.includes('.rotated.'))).toBe(true);

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);
    expect(doc.events).toHaveLength(1);
    expect(doc.events[0].event).toMatchObject({ queryFingerprint: 'fp-rot' });
  });

  it('buffers request timeline rows when emitted', async () => {
    const strapi = mockStrapi() as any;

    const dispose = attachPerformanceArtifactWriter(strapi);

    await strapi.eventHub.emit(PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY, {
      schemaVersion: 1,
      requestId: 'r1',
      durationMs: 900,
      method: 'GET',
      route: '/api/x',
      path: '/api/x',
      statusCode: 200,
      dbQueryCount: 0,
      dbTotalMs: 0,
      slowQueryCount: 0,
    });

    await dispose();

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);

    expect(doc.summary.requestCount).toBe(1);
    expect(doc.summary.slowRequestCount).toBe(1);
    expect(doc.events[0].kind).toBe(PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY);
  });
});

describe('summarizePerfArtifactBatch', () => {
  it('computes percentiles and slow request counts', () => {
    const rows = [
      {
        kind: PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
        emittedAt: 't',
        event: { durationMs: 10, queryFingerprint: 'a', type: 'query.slow' },
      },
      {
        kind: PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
        emittedAt: 't',
        event: { durationMs: 20, queryFingerprint: 'b', type: 'query.slow' },
      },
      {
        kind: PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
        emittedAt: 't',
        event: { durationMs: 100, queryFingerprint: 'c', type: 'query.slow' },
      },
      {
        kind: PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
        emittedAt: 't',
        event: { durationMs: 40 },
      },
      {
        kind: PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
        emittedAt: 't',
        event: { durationMs: 120 },
      },
    ] as const;

    const summary = summarizePerfArtifactBatch([...rows], { slowRequestMs: 50 });

    expect(summary.totalQueriesObserved).toBe(3);
    expect(summary.p50Ms).toBe(20);
    expect(summary.requestCount).toBe(2);
    expect(summary.slowRequestCount).toBe(1);
    expect(summary.topFingerprints).toHaveLength(3);
  });
});
