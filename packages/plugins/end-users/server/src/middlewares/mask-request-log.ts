import type { Core } from '@strapi/types';

import { resolveBasePath } from '../engine/better-auth/base-path';

const MASK = '[masked]';

/**
 * Query parameters that carry a secret: Better Auth's `token`, the compat `confirmation`, an OAuth
 * `code`, and the tokens and verifiers a provider's redirect or an old Users & Permissions front end
 * puts in a callback URL. `state` is left alone: it names no secret the log could leak.
 */
const SECRET_QUERY_PARAM =
  /([?&](?:token|confirmation|code|access_token|id_token|refresh_token|oauth_token|oauth_verifier)=)[^&#\s]*/gi;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `text` with the secrets of an auth link blanked: the token in the path of Better Auth's
 * `/reset-password/<token>` and the one-time values in a query string. What is left says which
 * endpoint was called and how long it took, which is all a request log is for.
 */
export const maskSecretsInUrl = (text: string, basePath: string): string =>
  text
    .replace(new RegExp(`(${escapeRegExp(basePath)}/reset-password/)[^/?#\\s]+`, 'gi'), `$1${MASK}`)
    .replace(SECRET_QUERY_PARAM, `$1${MASK}`);

const MASKED = Symbol.for('strapi.end-users.masked-request-log');

type HttpLog = (...args: unknown[]) => unknown;

/**
 * Strapi's request logger (`strapi::logger`) writes the full URL of every request, and the link in a
 * reset-password, magic-link or verification email is a request to this server: the token would sit
 * in the log, and in whatever collects it, for as long as it is valid. The logger reads the URL once
 * the request is done, so it cannot be changed under it without changing what the engine sees; the
 * line it writes is masked on the way to the log instead, which needs no change to the logger or to
 * the project's middleware list. Installed once.
 */
export const maskRequestLog = (strapi: Core.Strapi) => {
  const log = strapi.log as unknown as Record<PropertyKey, unknown> | undefined;
  const write = log?.http;

  if (!log || typeof write !== 'function' || log[MASKED]) {
    return;
  }

  const basePath = resolveBasePath(strapi.config);

  log.http = (...args: unknown[]) =>
    (write as HttpLog).apply(
      log,
      args.map((arg) => (typeof arg === 'string' ? maskSecretsInUrl(arg, basePath) : arg))
    );
  log[MASKED] = true;
};
