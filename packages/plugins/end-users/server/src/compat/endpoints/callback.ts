import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type providerService from '../../services/provider';
import type { CompatConfig } from '../config';
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

/**
 * `GET /api/auth/:provider/callback`: what the front end calls after the provider sent the browser
 * back to it, answered with `{ jwt, user }`. The sign-in was finished on the connect callback, which
 * left the session cookie in the browser: this reads that session, as the engine does for any
 * request. `jwt` is the session token (not a JWT), and in the cookie form it is the refresh token
 * too. A call with no session is refused. Nothing in the query is read: Users & Permissions took an
 * `access_token` from it, which here would be a way to name a session.
 */
export const callback = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { provider, headers, token }: CallbackInput
): Promise<CompatResult> => {
  const providers = await (
    strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<typeof providerService>
  ).list();

  if (!providers.some((one) => one.id === provider && one.enabled)) {
    return { status: 400, body: upError('ApplicationError', 'This provider is disabled') };
  }

  const session = await engineOf(strapi).getSession(new Headers(headers));
  const user = session ? await signedInUser(strapi, session.userId) : null;

  if (!session || !user || !token) {
    return { status: 400, body: upError('ApplicationError', NO_SESSION) };
  }

  const cookie = cfg.refresh.enabled && wantsRefreshCookie(cfg, headers);

  return ok(
    loginBody(cfg, { token, user, cookie }),
    cookie ? [writeRefreshCookie(cfg, token)] : undefined
  );
};
