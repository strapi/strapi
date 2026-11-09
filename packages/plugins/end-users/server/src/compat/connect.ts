import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import type providerService from '../services/provider';
import { resolveBasePath } from '../engine/better-auth/base-path';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';
import type { AuthEngine } from '../engine/types';
import { readCompatConfig } from './config';

/** The `/api` (or whatever `api.rest.prefix` is) the connect routes are mounted under. */
const restPrefix = (strapi: Core.Strapi): string =>
  resolveBasePath(strapi.config).replace(/\/auth$/, '');

/**
 * The redirect URI of a provider in the compatibility mode: the connect callback Users &
 * Permissions had, so a provider registered for it keeps working.
 */
export const connectRedirectUri = (strapi: Core.Strapi, provider: string): string =>
  `${resolveServerOrigin(strapi.config)}${restPrefix(strapi)}/connect/${provider}/callback`;

/** An absolute http(s) URL, as the parser normalises it (its `href`), or `null`. */
const absoluteUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const { protocol, href } = new URL(value);

    return protocol === 'http:' || protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
};

/**
 * Where the browser lands once the provider is done, from the first source that has one:
 * 1. the request's `?callback=`
 * 2. the project's `compat.connect.callbacks` entry for the provider
 * 3. the address Users & Permissions defaulted to, `/api/auth/<provider>/callback` on this server,
 *    which is the route that answers with `{ jwt, user }`
 *
 * The URL is the parsed one (`href`), the form the engine stores and redirects to.
 * `null` when the first or the second source has a value that is not an absolute http(s) URL.
 * Whether the origin of a `?callback=` is trusted is `resolveFrontendCallback`'s to decide.
 */
export const frontendCallback = (
  strapi: Core.Strapi,
  provider: string,
  queryCallback: string | undefined
): string | null => {
  if (queryCallback !== undefined) {
    return absoluteUrl(queryCallback);
  }

  const { callbacks } = readCompatConfig(strapi).connect;

  if (Object.hasOwn(callbacks, provider)) {
    return absoluteUrl(callbacks[provider]);
  }

  return `${resolveServerOrigin(strapi.config)}${resolveBasePath(strapi.config)}/${provider}/callback`;
};

/**
 * `frontendCallback`, and a `?callback=` is held to the engine's own origin rule: its origin is
 * the server's or one of `trustedOrigins`, wildcards included. The configured address was checked
 * at start-up, the default is the server's own.
 */
export const resolveFrontendCallback = async (
  strapi: Core.Strapi,
  engine: Pick<AuthEngine, 'isTrustedOrigin'>,
  provider: string,
  queryCallback: string | undefined
): Promise<string | null> => {
  const url = frontendCallback(strapi, provider, queryCallback);

  if (url === null || queryCallback === undefined) {
    return url;
  }

  return (await engine.isTrustedOrigin(new URL(url).origin)) ? url : null;
};

/** Whether the provider is one the engine runs: known, and enabled. */
export const isProviderEnabled = async (
  strapi: Core.Strapi,
  provider: string
): Promise<boolean> => {
  const providers = await (
    strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<typeof providerService>
  ).list();

  return providers.some((one) => one.id === provider && one.enabled);
};
