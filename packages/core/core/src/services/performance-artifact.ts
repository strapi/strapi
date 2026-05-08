import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Core, Modules } from '@strapi/types';

const DB_SLOW_EVENT = 'performance.db.query.slow';
const DB_ERROR_EVENT = 'performance.db.query.error';

export type PerformanceArtifactDisposed = () => Promise<void>;

const shouldCaptureArtifact = (output: unknown) => output === 'artifact' || output === 'both';

/**
 * Buffered performance artifact: each flush appends one JSON object (single line) to `artifactPath`.
 */
export function attachPerformanceArtifactWriter(strapi: Core.Strapi): PerformanceArtifactDisposed {
  const output = strapi.config.get('database.performance.output', 'none');
  const artifactPath = strapi.config.get('database.performance.artifactPath') as string | undefined;

  if (!shouldCaptureArtifact(output) || !artifactPath) {
    return async () => {
      /* no-op */
    };
  }

  const flushMsRaw = strapi.config.get('database.performance.artifactFlushIntervalMs', 5000);
  const maxEventsRaw = strapi.config.get('database.performance.artifactMaxEvents', 1000);

  const flushMs = typeof flushMsRaw === 'number' && flushMsRaw > 0 ? flushMsRaw : 5000;
  const maxEvents = typeof maxEventsRaw === 'number' && maxEventsRaw > 0 ? maxEventsRaw : 1000;

  const buffer: unknown[] = [];
  let flushInProgress = false;

  const serializeLine = (events: unknown[]) =>
    `${JSON.stringify({
      schemaVersion: 1 as const,
      flushedAt: new Date().toISOString(),
      events,
    })}\n`;

  const flush = async () => {
    if (flushInProgress || buffer.length === 0) {
      return;
    }

    flushInProgress = true;
    const chunk = buffer.splice(0, buffer.length);

    try {
      await mkdir(path.dirname(path.resolve(artifactPath)), { recursive: true });
      await writeFile(artifactPath, serializeLine(chunk), {
        encoding: 'utf8',
        flag: 'a',
      });
    } catch {
      /* fail-open: monitoring must never take down Strapi */
    } finally {
      flushInProgress = false;
    }
  };

  const subscriber: Modules.EventHub.Subscriber = async (eventName, ...args) => {
    if (eventName !== DB_SLOW_EVENT && eventName !== DB_ERROR_EVENT) {
      return;
    }

    buffer.push({
      kind: eventName,
      emittedAt: new Date().toISOString(),
      event: args[0],
    });

    while (buffer.length > maxEvents) {
      buffer.shift();
    }
  };

  const unsubscribe = strapi.eventHub.subscribe(subscriber);

  const flushTimer = setInterval(() => {
    flush().catch(() => {});
  }, flushMs);
  flushTimer.unref?.();

  return async () => {
    clearInterval(flushTimer);
    unsubscribe();
    await flush();
  };
}
