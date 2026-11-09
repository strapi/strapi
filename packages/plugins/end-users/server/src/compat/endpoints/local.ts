import { createHash } from 'node:crypto';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import type { AuthEngine, NativeResult } from '../../engine/types';
import type settingsService from '../../services/settings';
import type { CompatConfig } from '../config';
import { normalizeUsername } from '../../utils/normalize-username';
import { missingFieldBody, refusalResult, upError } from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { withPendingDevice } from '../pending-device';
import { wantsRefreshCookie, writeRefreshCookie } from '../refresh-cookie';
import { ok } from './result';
import { BEARER_HEADER, PROVIDER_DISABLED, TWO_FACTOR_REQUIRED, plain } from './shared';
import type { CompatResult } from '../types';

interface LocalInput {
  body: unknown;
  headers: Headers | undefined;
}

/**
 * The address a username with no account is signed in with: reserved (`.invalid` never resolves),
 * and valid whatever the characters of the identifier, because it is a hash of them. The engine
 * then does the work it does for any unknown address, and counts the attempt for it.
 */
const placeholderEmail = (identifier: string): string =>
  `${createHash('sha256').update(identifier).digest('hex')}@username.invalid`;

/**
 * The address to sign in with for an identifier that is not one. The engine's own username sign-in
 * refuses names it did not accept at sign-up (too short, a hyphen) before it looks anyone up, and
 * users-permissions allowed them, so the user is found here and signed in by their stored address.
 */
const emailOfUsername = async (strapi: Core.Strapi, username: string): Promise<string> => {
  const user = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { username }, select: ['email'] })) as { email?: unknown } | null;

  return typeof user?.email === 'string' && user.email !== ''
    ? user.email
    : placeholderEmail(username);
};

/** The refusal of a body that lacks the identifier or the password, or `null`. */
const missingCredential = (input: Record<string, unknown>): CompatResult | null => {
  for (const field of ['identifier', 'password']) {
    const value = input[field];

    if (typeof value !== 'string' || value === '') {
      return { status: 400, body: missingFieldBody(field) };
    }
  }

  return null;
};

/** The engine's answer to the sign-in as the compat answer: the token and the user, or the second factor's refusal. */
const answerOf = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  headers: Headers | undefined,
  { headers: answered, response }: { headers: Headers; response: NativeResult<'signInEmail'> }
): Promise<CompatResult> => {
  // The second factor is the native routes' to ask for: a compat client has no way to answer it,
  // and gets no token
  if (response.twoFactorRedirect) {
    return {
      status: 403,
      body: upError('ForbiddenError', TWO_FACTOR_REQUIRED, { code: 'TWO_FACTOR_REQUIRED' }),
    };
  }

  const token = answered.get(BEARER_HEADER);
  const user = await signedInUser(strapi, response.user.id);

  if (!token || !user) {
    throw new Error('The sign-in did not give a session token.');
  }

  const cookie = cfg.refresh.enabled && wantsRefreshCookie(cfg, headers);

  return ok(
    loginBody(cfg, { token, user, cookie }),
    cookie ? [writeRefreshCookie(cfg, token)] : undefined
  );
};

/**
 * `POST /api/auth/local`: an identifier (an address or a username) and a password, answered with
 * `{ jwt, user }`. An identifier with an `@` is an address, anything else a username that is looked
 * up and signed in by its address, both lower-cased. The sign-in is the engine's email sign-in, so
 * a lock and the password policy apply to it. A refusal the engine gave with users-permissions' own
 * text is that text as a 400; any other (a locked account) is Strapi's error envelope with the
 * engine's status, message and code. A `deviceId` in the body is stored on the session; the refresh
 * token is in the body, or in a cookie when `refresh.httpOnly` is on or the request asks for it.
 */
export const local = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: LocalInput
): Promise<CompatResult> => {
  const input = plain(body);
  const missing = missingCredential(input);

  if (missing) {
    return missing;
  }

  const identifier = input.identifier as string;
  const password = input.password as string;
  const plugin = strapi.plugin(PLUGIN_ID);
  const { methods } = await (
    plugin.service('settings') as ReturnType<typeof settingsService>
  ).get();
  const byEmail = identifier.includes('@');

  if (!(byEmail ? methods.emailPassword : methods.username)) {
    return { status: 400, body: upError('ApplicationError', PROVIDER_DISABLED) };
  }

  const engine = plugin.service('engine').get() as AuthEngine;
  const lowered = normalizeUsername(identifier);
  const email = byEmail ? lowered : await emailOfUsername(strapi, lowered);
  const sent = { headers: new Headers(headers) };

  try {
    const call = () => engine.callNative('signInEmail', { ...sent, body: { email, password } });
    const { deviceId } = input;
    const answered =
      typeof deviceId === 'string' && deviceId !== ''
        ? await withPendingDevice(deviceId, call)
        : await call();

    return await answerOf(strapi, cfg, headers, answered);
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }
};
