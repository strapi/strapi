import type { Core } from '@strapi/types';

import type { CompatConfig } from '../config';
import { isProviderEnabled } from '../connect';
import { upError } from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { wantsRefreshCookie, writeRefreshCookie } from '../refresh-cookie';
import { ok } from './result';
import { engineOf } from './shared';
import type { CompatResult } from '../types';

interface CallbackInput {
  provider: string;
  headers: Headers | undefined;
  /** The session token as the session cookie holds it, or `undefined` when there is no cookie. */
  token: string | undefined;
}

const NO_SESSION = 'OAuth authentication requires a completed provider session';

/** How long after its sign-in a session may still be exchanged. */
const EXCHANGE_WINDOW_MS = 5 * 60 * 1000;

/** The request's session cookie alone: a Bearer header would be read ahead of it. */
const cookieOnly = (headers: Headers | undefined): Headers => {
  const cookie = headers?.get('cookie');

  return new Headers(cookie ? { cookie } : {});
};

/**
 * `GET /api/auth/:provider/callback`: what the front end calls after the provider sent the browser
 * back to it, answered with `{ jwt, user }`. The sign-in was finished on the connect callback, which
 * left the session cookie in the browser: this reads that session from the cookie. `jwt` is the
 * session token (not a JWT), and in the cookie form it is the refresh token too.
 *
 * The token goes only to the session this provider's sign-in just made, once: the session is at
 * most five minutes old, its user has an account with this provider, it is not an impersonation, and
 * the sign-in's record of it is spent by this exchange (one conditional delete, so of two requests
 * one wins, on any server instance). Any other session, a password sign-in's or an old one, is
 * refused, since the cookie would otherwise become a bearer credential. Nothing in the query is
 * read: Users & Permissions took an `access_token` from it, which here would be a way to name a
 * session.
 */
export const callback = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { provider, headers, token }: CallbackInput
): Promise<CompatResult> => {
  if (!(await isProviderEnabled(strapi, provider))) {
    return { status: 400, body: upError('ApplicationError', 'This provider is disabled') };
  }

  const engine = engineOf(strapi);
  const session = await engine.getSession(cookieOnly(headers));
  const user = session ? await signedInUser(strapi, session.userId) : null;

  if (!session || !user || !token) {
    return { status: 400, body: upError('ApplicationError', NO_SESSION) };
  }

  const fresh = Date.now() - session.createdAt.getTime() <= EXCHANGE_WINDOW_MS;
  const accounts =
    fresh && !session.impersonatedBy ? await engine.listAccounts(session.userId) : [];

  // The record is spent last, so a session refused for another reason keeps it
  if (
    !accounts.some(({ providerId }) => providerId === provider) ||
    !(await engine.claimProviderSession(session.id, provider))
  ) {
    return { status: 400, body: upError('ApplicationError', NO_SESSION) };
  }

  const cookie = cfg.refresh.enabled && wantsRefreshCookie(cfg, headers);

  return {
    ...ok(
      loginBody(cfg, { token, user, cookie }),
      cookie ? [writeRefreshCookie(cfg, token)] : undefined
    ),
    headers: { 'cache-control': 'no-store' },
  };
};
