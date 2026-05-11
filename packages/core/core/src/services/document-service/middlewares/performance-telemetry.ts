import type { Core } from '@strapi/types';

import { withDocumentServiceObservation } from '../../observability/opentelemetry-tracing';

import type { Middleware } from './middleware-manager';

/**
 * OTLP spans + histogram for every `strapi.documents(uid).{action}(…)` call (REST, admin, plugins).
 */
export const createDocumentServicePerformanceTelemetryMiddleware = (
  strapi: Core.Strapi
): Middleware => {
  return async (ctx, next) => {
    const uid = ctx.uid as string;
    const operation = ctx.action as string;

    return withDocumentServiceObservation(strapi, operation, uid, () => next());
  };
};
