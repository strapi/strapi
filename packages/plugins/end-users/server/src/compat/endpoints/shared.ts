import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type settingsService from '../../services/settings';
import { upError } from '../errors';
import type { CompatResult } from '../types';

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

export const PROVIDER_DISABLED = 'This provider is disabled.';

/** The refusal of an endpoint that needs email and password sign-in while it is turned off, or `null`. */
export const emailPasswordRefusal = async (strapi: Core.Strapi): Promise<CompatResult | null> => {
  const { methods } = await (
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>
  ).get();

  return methods.emailPassword
    ? null
    : { status: 400, body: upError('ApplicationError', PROVIDER_DISABLED) };
};
