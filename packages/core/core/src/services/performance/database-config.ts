import type { Core } from '@strapi/types';

export const DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS = 5000;

export const DEFAULT_DATABASE_PERF_MAX_EVENTS = 10_000;

export function resolveDatabasePerformanceFlushIntervalMs(strapi: Core.Strapi): number {
  const value = strapi.config.get('database.performance.flushIntervalMs');
  return typeof value === 'number' && value > 0 ? value : DEFAULT_DATABASE_PERF_FLUSH_INTERVAL_MS;
}

export function resolveDatabasePerformanceMaxEvents(strapi: Core.Strapi): number {
  const value = strapi.config.get('database.performance.maxEvents');
  return typeof value === 'number' && value > 0 ? value : DEFAULT_DATABASE_PERF_MAX_EVENTS;
}

/** `0` = no file rotation; positive = rotate when the artifact reaches this size (bytes) before append. */
export function resolveDatabasePerformanceArtifactMaxFileBytes(strapi: Core.Strapi): number {
  const v = strapi.config.get('database.performance.artifactMaxFileBytes');
  if (typeof v === 'number' && v > 0) {
    return v;
  }
  return 0;
}
