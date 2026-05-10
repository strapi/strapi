import type { Core } from '@strapi/types';

/** True when per-request perf ids / summaries should run (supports spec alias `requestTrackingEnabled`). */
export function isServerRequestPerfTrackingEnabled(strapi: Core.Strapi): boolean {
  return (
    strapi.config.get('server.performance.requestSummaryEnabled') === true ||
    strapi.config.get('server.performance.requestTrackingEnabled') === true
  );
}
