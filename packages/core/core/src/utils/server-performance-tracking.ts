import type { Core } from '@strapi/types';

/** True when per-request perf ids / summaries should run. */
export function isServerRequestPerfTrackingEnabled(strapi: Core.Strapi): boolean {
  return strapi.config.get('server.performance.requestTrackingEnabled') === true;
}

function clampUnitInterval(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

/** Returns `value` when it is a finite, non-negative number; otherwise `fallback`. */
export function clampPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return fallback;
  }
  return value;
}

/** Hub emission tuning for request timeline events (spec 03). */
export function getServerRequestPerformanceEmitSettings(strapi: Core.Strapi): {
  slowRequestMs: number;
  requestSampleRate: number;
  emitStageEvents: boolean;
} {
  return {
    slowRequestMs: clampPositiveInt(strapi.config.get('server.performance.slowRequestMs'), 500),
    requestSampleRate: clampUnitInterval(
      strapi.config.get('server.performance.requestSampleRate'),
      0.1
    ),
    emitStageEvents: strapi.config.get('server.performance.emitStageEvents') === true,
  };
}
