import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';

/** `localhost`, a name under it, `127.x.x.x` or `[::1]`: an address that never leaves the machine. */
const isLoopbackHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname.endsWith('.localhost') ||
  /^127(?:\.\d{1,3}){3}$/.test(hostname) ||
  hostname === '[::1]';

/** The applications already told that their session cookie is not Secure: once per start. */
const warned = new WeakSet<object>();

/**
 * Better Auth's `advanced.useSecureCookies` for the server's address, outside development.
 *
 * Better Auth marks the session cookie `Secure` (and names it with the `__Secure-` prefix) when the
 * address it is given starts with `https://`, and in no other case. Outside development an
 * `https://` address sets it here as well, so the choice is the plugin's and not left to that
 * reading. A plain `http://` address on a loopback host is a production build tried on one machine:
 * the cookie stays as it is, and nothing is said. A plain `http://` address on any other host
 * starts as it is too, since forcing `Secure` there would stop browsers from storing the cookie at
 * all, but the application is told once that the session cookie is not Secure.
 *
 * A project can still set `advanced.useSecureCookies` itself with `defineAuth`: its value wins.
 */
export const secureCookieOptions = (
  strapi: Core.Strapi,
  envVars: Record<string, string | undefined> = process.env
): { useSecureCookies?: true } => {
  // Strapi treats an unset NODE_ENV as development
  if ((envVars.NODE_ENV || 'development') === 'development') {
    return {};
  }

  const origin = resolveServerOrigin(strapi.config);
  const { protocol, hostname } = new URL(origin);

  if (protocol === 'https:') {
    return { useSecureCookies: true };
  }

  if (!isLoopbackHost(hostname) && !warned.has(strapi)) {
    warned.add(strapi);
    strapi.log.warn(
      `${PLUGIN_ID}: the server's address is ${origin}, plain http, so the session cookie is not ` +
        'Secure: a browser also sends it over unencrypted connections, where it can be read on the ' +
        'way. If Strapi is behind a proxy that serves https, set server.url in config/server.js ' +
        'to the public https address.'
    );
  }

  return {};
};
