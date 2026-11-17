import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import type { AuthEngine } from '../../engine/types';
import type roleService from '../../services/role';
import type settingsService from '../../services/settings';
import { normalizeEmail } from '../../utils/normalize-email';
import { normalizeUsername } from '../../utils/normalize-username';
import type { CompatConfig } from '../config';
import {
  EMAIL_OR_USERNAME_TAKEN,
  REGISTER_DISABLED,
  invalidParameters,
  missingFieldBody,
  refusalResult,
  upError,
} from '../errors';
import { loginBody, signedInUser } from '../login-response';
import { withPendingUsername } from '../pending-username';
import { toUpRole } from '../shapes';
import { ok } from './result';
import { BEARER_HEADER, emailPasswordRefusal } from './shared';
import type { CompatResult } from '../types';

interface RegisterInput {
  body: unknown;
  headers: Headers | undefined;
}

/** The keys every register body may carry; the registration fields of the settings come on top. */
const REGISTER_KEYS = ['username', 'email', 'password'] as const;

const isTaken = async (strapi: Core.Strapi, email: string, username: string): Promise<boolean> => {
  const found = await strapi.db
    .query(USER_UID)
    .findOne({ where: { $or: [{ email }, { username }] }, select: ['documentId'] });

  return found !== null && found !== undefined;
};

/**
 * `POST /api/auth/local/register`: `{ username, email, password }` and the registration fields of
 * the settings, answered with `{ jwt, user }`, or `{ user }` when the address has to be confirmed
 * first (no session exists then, so there is no token). Any other key is refused, `deviceId`
 * included. A taken address or username is one 400, checked before the sign-up runs. The sign-up is
 * the engine's own, with `name` set to the username, so the password policy, the profile fields and
 * the confirmation email work as they do for the native route.
 *
 * The username is not sent to the engine's sign-up: that validates it (three characters or more,
 * letters, digits, `_` and `.`), and users-permissions allowed `jo` and `john-doe`. It is stored
 * in the same user create, in the one spelling the plugin looks usernames up by.
 */
export const register = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: RegisterInput
): Promise<CompatResult> => {
  const plugin = strapi.plugin(PLUGIN_ID);
  const settingsApi = plugin.service('settings') as ReturnType<typeof settingsService>;
  const { signUp } = await settingsApi.get();

  if (!signUp.enabled) {
    return { status: 400, body: upError('ApplicationError', REGISTER_DISABLED) };
  }

  // A password sign-up while that sign-in is off would leave an account only a provider may use
  const refusal = await emailPasswordRefusal(strapi);

  if (refusal) {
    return refusal;
  }

  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const fields = await settingsApi.getSignUpFields();
  const allowed = new Set<string>([...REGISTER_KEYS, ...fields]);
  const refused = Object.keys(input).filter((key) => !allowed.has(key));

  if (refused.length > 0) {
    return {
      status: 400,
      body: upError('ApplicationError', invalidParameters(refused)),
    };
  }

  for (const field of REGISTER_KEYS) {
    if (typeof input[field] !== 'string' || input[field] === '') {
      return { status: 400, body: missingFieldBody(field) };
    }
  }

  const username = input.username as string;
  const email = normalizeEmail(input.email as string);
  const storedUsername = normalizeUsername(username);

  // Users & Permissions answered a taken email or username with this 400, and sign-up forms show
  // its text, so the compatible route keeps it. That tells a caller whether an address is
  // registered, which the native sign-up does not. The trade-off is accepted for compatibility: the
  // route is rate-limited, exists only while `compat.usersPermissions` is on, and the migration
  // report names it.
  if (await isTaken(strapi, email, storedUsername)) {
    return { status: 400, body: upError('ApplicationError', EMAIL_OR_USERNAME_TAKEN) };
  }

  const engine = plugin.service('engine').get() as AuthEngine;
  const profile = Object.fromEntries(
    fields.filter((key) => key in input).map((key) => [key, input[key]])
  );

  try {
    // The username goes into the user's own create (see `pending-username`), so there is no
    // moment at which the user exists without it
    const { headers: answered, response } = await withPendingUsername(storedUsername, () =>
      engine.callNative('signUpEmail', {
        headers: new Headers(headers),
        body: { ...profile, name: username, email, password: input.password },
      })
    );
    const documentId = response.user.id as string;

    const [user, held] = await Promise.all([
      signedInUser(strapi, documentId),
      (plugin.service('role') as ReturnType<typeof roleService>).getForUser(documentId),
    ]);

    if (!user) {
      throw new Error('The sign-up did not create the user.');
    }

    const withRole = { ...user, role: toUpRole(held) };

    if (signUp.requireEmailVerification) {
      return ok({ user: withRole });
    }

    const token = answered.get(BEARER_HEADER);

    if (!token) {
      throw new Error('The sign-up did not give a session token.');
    }

    return ok(loginBody(cfg, { token, user: withRole, cookie: false }));
  } catch (error) {
    const refused = refusalResult(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }
};
