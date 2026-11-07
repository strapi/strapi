import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type settingsService from '../../services/settings';
import type { CompatConfig } from '../config';
import { mapAuthError, upError } from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { ok } from './result';
import type { CompatResult } from './result';

interface LocalInput {
  body: unknown;
  headers: Headers | undefined;
}

const DISABLED = 'This provider is disabled.';
const TWO_FACTOR_REQUIRED = 'Two-factor authentication is required to sign in.';

/** The Bearer token the engine's bearer plugin sets next to the session cookie. */
const BEARER_HEADER = 'set-auth-token';

const missing = (field: string): CompatResult => ({
  status: 400,
  body: upError('ValidationError', `${field} is a required field`, {
    errors: [{ path: [field], name: 'ValidationError', message: `${field} is a required field` }],
  }),
});

/** The code of an error the engine threw, when it threw one of its own (`statusCode` and a `body`). */
const engineCode = (error: unknown): string | undefined => {
  const { statusCode, body } = (error ?? {}) as { statusCode?: unknown; body?: { code?: unknown } };

  return typeof statusCode === 'number' && typeof body?.code === 'string' ? body.code : undefined;
};

/**
 * `POST /api/auth/local`: an identifier (an address or a username) and a password, answered with
 * `{ jwt, user }`. An identifier with an `@` is an address and goes to the email sign-in, anything
 * else to the username sign-in, both lower-cased. The sign-in is the engine's own, so a lock, a
 * rate limit and the password policy apply to it. A refusal the engine gave with users-permissions'
 * own text is that text as a 400; any other (a locked account) is the engine's answer as it is.
 */
export const local = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: LocalInput
): Promise<CompatResult> => {
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { identifier, password } = input;

  if (typeof identifier !== 'string' || identifier === '') {
    return missing('identifier');
  }

  if (typeof password !== 'string' || password === '') {
    return missing('password');
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
  const lowered = identifier.toLowerCase();
  const sent = { headers: new Headers(headers) };

  try {
    const { headers: answered, response } = byEmail
      ? await engine.callNative('signInEmail', { ...sent, body: { email: lowered, password } })
      : await engine.callNative('signInUsername', {
          ...sent,
          body: { username: lowered, password },
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
    const code = engineCode(error);
    const mapped = code === undefined ? null : mapAuthError(code);

    if (mapped === null) {
      throw error;
    }

    return { status: 400, body: upError(mapped.name, mapped.message) };
  }
};
