import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import { normalizeEmail } from '../../utils/normalize-email';
import type { CompatConfig } from '../config';
import {
  PASSWORDS_DO_NOT_MATCH,
  invalidParameters,
  missingFieldBody,
  refusalResult,
  upError,
} from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { ok } from './result';
import {
  BEARER_HEADER,
  TWO_FACTOR_REQUIRED,
  emailPasswordRefusal,
  engineOf,
  plain,
} from './shared';
import type { CompatResult } from '../types';

interface PasswordInput {
  body: unknown;
  headers: Headers | undefined;
}

const has = (body: Record<string, unknown>, key: string): boolean => Object.hasOwn(body, key);

/**
 * The reset body users-permissions took: a `code` and no `token`. A body with both is the native
 * one, and so is one with `token` alone.
 */
export const isCompatReset = (body: unknown): boolean => {
  const input = plain(body);

  return has(input, 'code') && !has(input, 'token');
};

/** The change body users-permissions took: a `passwordConfirmation` and no `newPassword`. */
export const isCompatChange = (body: unknown): boolean => {
  const input = plain(body);

  return has(input, 'passwordConfirmation') && !has(input, 'newPassword');
};

const text = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * `POST /api/auth/forgot-password`: `{ email }` and no other key, answered with `{ ok: true }`
 * whether or not the address has an account (the engine does not say either). The link in the email
 * is built on the reset base of the settings by the email sender, so no redirect is passed here.
 */
export const forgotPassword = async (
  strapi: Core.Strapi,
  _cfg: CompatConfig,
  { body, headers }: PasswordInput
): Promise<CompatResult> => {
  const refusal = await emailPasswordRefusal(strapi);

  if (refusal) {
    return refusal;
  }

  const input = plain(body);
  const extra = Object.keys(input).filter((key) => key !== 'email');

  if (extra.length > 0) {
    return { status: 400, body: upError('ApplicationError', invalidParameters(extra)) };
  }

  if (!text(input.email)) {
    return { status: 400, body: missingFieldBody('email') };
  }

  try {
    await engineOf(strapi).callNative('requestPasswordReset', {
      headers: new Headers(headers),
      body: { email: normalizeEmail(input.email) },
    });
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }

  return ok({ ok: true });
};

/** The answer of a reset or change: the user is signed in with the password just set. */
const signInWith = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  userId: string,
  password: string,
  headers: Headers | undefined
): Promise<CompatResult> => {
  const user = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { documentId: userId }, select: ['email'] })) as { email?: unknown } | null;

  if (typeof user?.email !== 'string') {
    throw new TypeError('The user of the reset could not be found.');
  }

  const { headers: answered, response } = await engineOf(strapi).callNative('signInEmail', {
    headers: new Headers(headers),
    body: { email: user.email, password },
  });

  if (response.twoFactorRedirect) {
    return {
      status: 403,
      body: upError('ForbiddenError', TWO_FACTOR_REQUIRED, { code: 'TWO_FACTOR_REQUIRED' }),
    };
  }

  const token = answered.get(BEARER_HEADER);
  const signedIn = await signedInUser(strapi, userId);

  if (!token || !signedIn) {
    throw new Error('The sign-in did not give a session token.');
  }

  return ok(loginBody(cfg, { token, user: signedIn, cookie: false }));
};

interface ResetInput extends PasswordInput {
  /** The user a reset code belongs to, read before the reset consumes the code. */
  userOfCode: (code: string) => Promise<string | null>;
}

/**
 * `POST /api/auth/reset-password` with `{ code, password, passwordConfirmation }`, answered with
 * `{ jwt, user }`. The reset is the engine's own, with the native body (`token`, `newPassword`), so
 * lockout and the password policy read what the native route would. A code that is not one is a
 * 400 `Incorrect code provided`.
 */
export const resetPassword = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers, userOfCode }: ResetInput
): Promise<CompatResult> => {
  const input = plain(body);
  const refusal = await emailPasswordRefusal(strapi);

  if (refusal) {
    return refusal;
  }

  if (!text(input.code)) {
    return { status: 400, body: missingFieldBody('code') };
  }

  for (const field of ['password', 'passwordConfirmation']) {
    if (!text(input[field])) {
      return { status: 400, body: missingFieldBody(field) };
    }
  }

  if (input.password !== input.passwordConfirmation) {
    return { status: 400, body: upError('ApplicationError', PASSWORDS_DO_NOT_MATCH) };
  }

  const password = input.password as string;
  const userId = await userOfCode(input.code);

  try {
    await engineOf(strapi).callNative('resetPassword', {
      headers: new Headers(headers),
      body: { token: input.code, newPassword: password },
    });

    if (userId === null) {
      throw Object.assign(new Error('INVALID_TOKEN'), {
        statusCode: 400,
        body: { code: 'INVALID_TOKEN', message: 'INVALID_TOKEN' },
      });
    }

    // The reset has succeeded by now and its code is spent. The sign-in that follows is the normal
    // one, with every rule that applies to it (an unconfirmed address, a second factor, a lock): when
    // one of them refuses, the answer says so, and the password has changed all the same.
    return await signInWith(strapi, cfg, userId, password, headers);
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }
};

/**
 * `POST /api/auth/change-password` with `{ currentPassword, password, passwordConfirmation }`,
 * answered with `{ jwt, user }`: the new session the engine opens, as the other sessions are
 * revoked. A caller who is not signed in is refused by the engine.
 */
export const changePassword = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: PasswordInput
): Promise<CompatResult> => {
  const input = plain(body);
  const refusal = await emailPasswordRefusal(strapi);

  if (refusal) {
    return refusal;
  }

  for (const field of ['currentPassword', 'password', 'passwordConfirmation']) {
    if (!text(input[field])) {
      return { status: 400, body: missingFieldBody(field) };
    }
  }

  if (input.password !== input.passwordConfirmation) {
    return { status: 400, body: upError('ApplicationError', PASSWORDS_DO_NOT_MATCH) };
  }

  try {
    const { headers: answered, response } = await engineOf(strapi).callNative('changePassword', {
      headers: new Headers(headers),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.password,
        revokeOtherSessions: true,
      },
    });

    const token = answered.get(BEARER_HEADER);
    const user = await signedInUser(strapi, response.user.id);

    if (!token || !user) {
      throw new Error('The password change did not give a session token.');
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
