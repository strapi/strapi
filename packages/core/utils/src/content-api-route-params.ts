import type { z } from 'zod/v4';

import { ALLOWED_QUERY_PARAM_KEYS } from './content-api-constants';

/**
 * Minimal route shape used by sanitize/validate to derive allowed extra query/input params
 * from the route's request schema. When present, extra keys are taken from route.request.query
 * / route.request.body and validated or sanitized with Zod.
 */
export interface RouteLike {
  request?: {
    query?: Record<string, z.ZodTypeAny>;
    body?: Record<string, z.ZodTypeAny>;
  };
}

/** Extra query param keys from the route's request.query (excluding core ALLOWED_QUERY_PARAM_KEYS). */
export function getExtraQueryKeysFromRoute(route?: RouteLike): string[] {
  if (!route?.request?.query) return [];
  const coreKeys = new Set<string>(ALLOWED_QUERY_PARAM_KEYS as readonly string[]);
  return Object.keys(route.request.query).filter((key) => !coreKeys.has(key));
}

/** Root-level keys from the route's request.body['application/json'] schema shape (for Zod object schemas). */
export function getExtraRootKeysFromRouteBody(route?: RouteLike): string[] {
  const bodySchema = route?.request?.body?.['application/json'];
  if (!bodySchema || typeof bodySchema !== 'object') return [];
  if (
    'shape' in bodySchema &&
    typeof (bodySchema as { shape: Record<string, unknown> }).shape === 'object'
  ) {
    return Object.keys((bodySchema as { shape: Record<string, unknown> }).shape);
  }
  return [];
}
