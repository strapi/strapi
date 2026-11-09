import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type { AuthEngine } from '../../engine/types';

/** The Bearer token the engine's bearer plugin sets next to the session cookie. */
export const BEARER_HEADER = 'set-auth-token';

export const TWO_FACTOR_REQUIRED = 'Two-factor authentication is required to sign in.';

/** A request body or query as a plain object; anything else is an empty one. */
export const plain = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const engineOf = (strapi: Core.Strapi) =>
  strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;
