import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type settingsService from '../../services/settings';
import { normalizeEmail } from '../../utils/normalize-email';
import type { CompatConfig } from '../config';
import { INVALID_CONFIRMATION_TOKEN, missingFieldBody, refusalResult } from '../errors';
import { ok } from './result';
import type { CompatResult } from './result';

interface ConfirmationInput {
  query?: unknown;
  body?: unknown;
  headers: Headers | undefined;
}

/** What the engine says of a link it cannot use; users-permissions said one thing for them all. */
const BAD_LINK: Readonly<Record<string, string>> = {
  INVALID_TOKEN: INVALID_CONFIRMATION_TOKEN,
  TOKEN_EXPIRED: INVALID_CONFIRMATION_TOKEN,
  USER_NOT_FOUND: INVALID_CONFIRMATION_TOKEN,
};

const plain = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const engineOf = (strapi: Core.Strapi) =>
  strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;

/**
 * `GET /api/auth/email-confirmation?confirmation=<token>`: the engine verifies the address, then
 * the browser is sent on, to `redirects.emailVerified` of the settings or `/`. The answer is the
 * redirect as a `302` with its `location`.
 */
export const emailConfirmation = async (
  strapi: Core.Strapi,
  _cfg: CompatConfig,
  { query, headers }: ConfirmationInput
): Promise<CompatResult> => {
  const { confirmation } = plain(query);

  if (typeof confirmation !== 'string' || confirmation === '') {
    return { status: 400, body: missingFieldBody('confirmation') };
  }

  try {
    await engineOf(strapi).callNative('verifyEmail', {
      headers: new Headers(headers),
      query: { token: confirmation },
    });
  } catch (error) {
    const refused = refusalResult(error, BAD_LINK);

    if (refused === null) {
      throw error;
    }

    return refused;
  }

  const { redirects } = await (
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>
  ).get();

  return { status: 302, body: { location: redirects.emailVerified || '/' } };
};

/**
 * `POST /api/auth/send-email-confirmation`: `{ email }`, answered with `{ email, sent: true }` for
 * any address. users-permissions said "Already confirmed" for a confirmed one, which tells a
 * stranger which addresses have accounts, and that is not kept.
 */
export const sendEmailConfirmation = async (
  strapi: Core.Strapi,
  _cfg: CompatConfig,
  { body, headers }: ConfirmationInput
): Promise<CompatResult> => {
  const { email } = plain(body);

  if (typeof email !== 'string' || email === '') {
    return { status: 400, body: missingFieldBody('email') };
  }

  const address = normalizeEmail(email);

  try {
    await engineOf(strapi).callNative('sendVerificationEmail', {
      headers: new Headers(headers),
      body: { email: address },
    });
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }

  return ok({ email: address, sent: true });
};
