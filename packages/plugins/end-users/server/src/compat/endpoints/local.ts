import { createHash } from 'node:crypto';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type settingsService from '../../services/settings';
import type { CompatConfig } from '../config';
import { normalizeUsername } from '../../utils/normalize-username';
import { missingFieldBody, refusalResult, upError } from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { ok } from './result';
import { BEARER_HEADER, TWO_FACTOR_REQUIRED } from './shared';
import type { CompatResult } from '../types';

interface LocalInput {
  body: unknown;
  headers: Headers | undefined;
}

const DISABLED = 'This provider is disabled.';
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

/**
 * `POST /api/auth/local`: an identifier (an address or a username) and a password, answered with
 * `{ jwt, user }`. An identifier with an `@` is an address, anything else a username that is looked
 * up and signed in by its address, both lower-cased. The sign-in is the engine's email sign-in, so
 * a lock and the password policy apply to it. A refusal the engine gave with users-permissions' own
 * text is that text as a 400; any other (a locked account) is Strapi's error envelope with the
 * engine's status, message and code.
 */
export const local = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: LocalInput
): Promise<CompatResult> => {
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { identifier, password } = input;

  if (typeof identifier !== 'string' || identifier === '') {
    return { status: 400, body: missingFieldBody('identifier') };
  }

  if (typeof password !== 'string' || password === '') {
    return { status: 400, body: missingFieldBody('password') };
  }

  const plugin = strapi.plugin(PLUGIN_ID);
  const { methods } = await (
    plugin.service('settings') as ReturnType<typeof settingsService>
  ).get();
  const byEmail = identifier.includes('@');

  if (!(byEmail ? methods.emailPassword : methods.username)) {
    return { status: 400, body: upError('ApplicationError', DISABLED) };
  }

  const engine = plugin.service('engine').get() as AuthEngine;
  const lowered = normalizeUsername(identifier);
  const email = byEmail ? lowered : await emailOfUsername(strapi, lowered);
  const sent = { headers: new Headers(headers) };

  try {
    const { headers: answered, response } = await engine.callNative('signInEmail', {
      ...sent,
      body: { email, password },
    });

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

    return ok(loginBody(cfg, { token, user, cookie: false }));
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }
};
