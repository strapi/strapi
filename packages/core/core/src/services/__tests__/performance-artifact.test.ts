import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import createEventHub from '../event-hub';
import { attachPerformanceArtifactWriter } from '../performance-artifact';

describe('Performance artifact writer', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'strapi-perf-artifact-'));
    artifactPath = path.join(tmpDir, 'performance-artifact.ndjson');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes buffered events when disposed', async () => {
    const eventHub = createEventHub();

    const strapi = {
      config: {
        get(key: string, def?: unknown) {
          if (key === 'database.performance.output') {
            return 'artifact';
          }
          if (key === 'database.performance.artifactPath') {
            return artifactPath;
          }
          if (key === 'database.performance.artifactFlushIntervalMs') {
            return 120_000;
          }
          if (key === 'database.performance.artifactMaxEvents') {
            return 100;
          }

          return def;
        },
      },
      eventHub,
    };

    const dispose = attachPerformanceArtifactWriter(strapi as any);

    await eventHub.emit('performance.db.query.slow', {
      type: 'query.slow',
      durationMs: 120,
      success: true,
    });

    await dispose();

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);

    expect(doc.schemaVersion).toBe(1);
    expect(doc.events).toHaveLength(1);
    expect(doc.events[0].kind).toBe('performance.db.query.slow');
    expect(doc.events[0].event).toMatchObject({ type: 'query.slow' });
  });

  it('does not write files when artifact output is disabled', async () => {
    const eventHub = createEventHub();

    const strapi = {
      config: {
        get(key: string, def?: unknown) {
          if (key === 'database.performance.output') {
            return 'log';
          }
          if (key === 'database.performance.artifactPath') {
            return artifactPath;
          }

          return def;
        },
      },
      eventHub,
    };

    const dispose = attachPerformanceArtifactWriter(strapi as any);

    await eventHub.emit('performance.db.query.slow', { type: 'query.slow' });
    await dispose();

    await expect(readFile(artifactPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('respects artifactMaxEvents as a rolling cap', async () => {
    const eventHub = createEventHub();

    const strapi = {
      config: {
        get(key: string, def?: unknown) {
          if (key === 'database.performance.output') {
            return 'both';
          }
          if (key === 'database.performance.artifactPath') {
            return artifactPath;
          }
          if (key === 'database.performance.artifactFlushIntervalMs') {
            return 120_000;
          }
          if (key === 'database.performance.artifactMaxEvents') {
            return 2;
          }

          return def;
        },
      },
      eventHub,
    };

    const dispose = attachPerformanceArtifactWriter(strapi as any);

    await eventHub.emit('performance.db.query.slow', { id: '1' });
    await eventHub.emit('performance.db.query.slow', { id: '2' });
    await eventHub.emit('performance.db.query.error', { id: '3' });

    await dispose();

    const content = (await readFile(artifactPath, 'utf8')).trim();
    const doc = JSON.parse(content);

    expect(doc.events).toHaveLength(2);
    expect(doc.events[0].event).toMatchObject({ id: '2' });
    expect(doc.events[1].event).toMatchObject({ id: '3' });
  });
});
