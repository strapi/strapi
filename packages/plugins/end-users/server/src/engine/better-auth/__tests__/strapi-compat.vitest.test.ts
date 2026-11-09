import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthMiddleware } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { bearer, username } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { local } from '../../../compat/endpoints/local';
import { emailConfirmation, sendEmailConfirmation } from '../../../compat/endpoints/confirmation';
import {
  changePassword,
  forgotPassword,
  isCompatChange,
  isCompatReset,
  resetPassword,
} from '../../../compat/endpoints/passwords';
import { register } from '../../../compat/endpoints/register';
import { refresh } from '../../../compat/endpoints/refresh';
import { pendingDevice, withPendingDevice } from '../../../compat/pending-device';
import { readCompatConfig } from '../../../compat/config';
import { pendingUsername, withPendingUsername } from '../../../compat/pending-username';
import { backgroundTaskHandler } from '../background-tasks';
import { buildAuthOptions } from '../create-engine';
import type { AuthEngine } from '../../types';
import { passwordPolicy } from '../plugins/password-policy';
import { strapiCompat } from '../plugins/strapi-compat';

vi.mock('../../../compat/login-response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../compat/login-response')>()),
  signedInUser: vi.fn(async () => ({ id: 7, documentId: 'doc7', email: 'ann@example.com' })),
}));

const SECRET = 'test-secret-at-least-32-characters-long';

const configStrapi = (compat: boolean) =>
  ({
    config: {
      get: (path: string, fallback?: unknown) =>
        ({
          'plugin::end-users.secret': SECRET,
          'plugin::end-users.compat.usersPermissions': compat,
          'server.absoluteUrl': 'http://localhost:1337',
        })[path] ?? fallback,
    },
    dirs: { dist: { src: '/nonexistent/end-users/src' } },
    plugin: () => ({ service: () => ({}) }),
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }) as unknown as Core.Strapi;

const pluginIds = (compat: boolean) =>
  (buildAuthOptions(configStrapi(compat)).plugins ?? []).map((plugin) => plugin.id);

const engineError = (statusCode: number, code: string) =>
  Object.assign(new Error(code), { name: 'APIError', statusCode, body: { code, message: code } });

describe('strapi-compat', () => {
  let methods: { emailPassword: boolean; username: boolean };
  let callNative: ReturnType<typeof vi.fn>;
  let strapi: Core.Strapi;
  let findUser: ReturnType<typeof vi.fn>;

  const cfg = readCompatConfig(configStrapi(true));
  const signIn = (identifier: unknown, password: unknown = 'Passw0rd!long') =>
    local(strapi, cfg, { body: { identifier, password }, headers: new Headers() });

  beforeEach(() => {
    methods = { emailPassword: true, username: true };
    callNative = vi.fn(async () => ({
      headers: new Headers({ 'set-auth-token': 'signed.token' }),
      response: { token: 'raw', user: { id: 'doc7', email: 'ann@example.com' } },
    }));
    findUser = vi.fn(async () => null as { email: string } | null);
    strapi = {
      db: { query: () => ({ findOne: findUser }) },
      plugin: () => ({
        service: (name: string) =>
          name === 'engine'
            ? { get: () => ({ callNative }) as unknown as AuthEngine }
            : { get: async () => ({ methods }) },
      }),
    } as unknown as Core.Strapi;
  });

  it('sends an identifier with @ to the email sign-in and anything else to the username sign-in, lower-cased', async () => {
    const byEmail = await signIn('Ann@Example.COM');

    expect(callNative).toHaveBeenLastCalledWith(
      'signInEmail',
      expect.objectContaining({ body: { email: 'ann@example.com', password: 'Passw0rd!long' } })
    );
    expect(byEmail).toMatchObject({ status: 200, body: { jwt: 'signed.token' } });

    findUser.mockResolvedValueOnce({ email: 'ann-b@example.com' });
    await signIn('Ann_B');

    expect(findUser).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { username: 'ann_b' } })
    );
    expect(callNative).toHaveBeenLastCalledWith(
      'signInEmail',
      expect.objectContaining({ body: { email: 'ann-b@example.com', password: 'Passw0rd!long' } })
    );
  });

  it('signs in a username the native username sign-in would refuse (john-doe, jo)', async () => {
    for (const username of ['john-doe', 'jo']) {
      findUser.mockResolvedValueOnce({ email: `${username}@example.com` });
      callNative.mockClear();

      const result = await signIn(username);

      expect(result.status).toBe(200);
      expect(callNative).toHaveBeenCalledTimes(1);
      expect(callNative).toHaveBeenCalledWith(
        'signInEmail',
        expect.objectContaining({
          body: { email: `${username}@example.com`, password: 'Passw0rd!long' },
        })
      );
    }
  });

  it('answers an unknown username and an invalid-looking address with the same 400', async () => {
    callNative.mockRejectedValueOnce(engineError(401, 'INVALID_EMAIL_OR_PASSWORD'));

    const unknown = await signIn('Nobody-Here');
    const [call] = callNative.mock.calls.slice(-1);

    // A reserved address derived from the identifier, so the engine does its unknown-user work
    expect(call[0]).toBe('signInEmail');
    expect(call[1].body.email).toMatch(/^[0-9a-f]{64}@username\.invalid$/);

    callNative.mockRejectedValueOnce(engineError(400, 'INVALID_EMAIL'));

    const invalid = await signIn('not an@address');

    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual(unknown.body);
  });

  it('maps credential, unconfirmed, blocked and disabled-method errors to the users-permissions messages', async () => {
    const message = async (code: string, statusCode: number) => {
      callNative.mockRejectedValueOnce(engineError(statusCode, code));
      const result = await signIn('ann@example.com');

      expect(result.status).toBe(400);

      return (result.body as { error: { name: string; message: string } }).error;
    };

    expect(await message('INVALID_EMAIL_OR_PASSWORD', 401)).toMatchObject({
      name: 'ApplicationError',
      message: 'Invalid identifier or password',
    });
    expect((await message('INVALID_USERNAME_OR_PASSWORD', 401)).message).toBe(
      'Invalid identifier or password'
    );
    expect((await message('EMAIL_NOT_VERIFIED', 403)).message).toBe(
      'Your account email is not confirmed'
    );
    expect((await message('BANNED_USER', 403)).message).toBe(
      'Your account has been blocked by an administrator'
    );

    methods.emailPassword = false;
    callNative.mockClear();

    const disabled = await signIn('ann@example.com');

    expect(disabled).toMatchObject({
      status: 400,
      body: { error: { message: 'This provider is disabled.' } },
    });
    expect(callNative).not.toHaveBeenCalled();
  });

  it('answers a locked account with the Strapi envelope, its status and its code', async () => {
    callNative.mockRejectedValueOnce(engineError(403, 'ACCOUNT_LOCKED'));

    expect(await signIn('ann@example.com')).toEqual({
      status: 403,
      body: {
        data: null,
        error: {
          status: 403,
          name: 'ForbiddenError',
          message: 'ACCOUNT_LOCKED',
          details: { code: 'ACCOUNT_LOCKED' },
        },
      },
    });
  });

  it('answers any other engine refusal as an ApplicationError with its status and code', async () => {
    callNative.mockRejectedValueOnce(engineError(429, 'TOO_MANY'));

    expect(await signIn('ann@example.com')).toMatchObject({
      status: 429,
      body: { error: { name: 'ApplicationError', details: { code: 'TOO_MANY' } } },
    });
  });

  it('answers a two-factor user with 403 TWO_FACTOR_REQUIRED and no token', async () => {
    callNative.mockResolvedValueOnce({
      headers: new Headers({ 'set-auth-token': 'must-not-leak' }),
      response: { twoFactorRedirect: true, user: { id: 'doc7', email: 'ann@example.com' } },
    });

    const result = await signIn('ann@example.com');

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ error: { details: { code: 'TWO_FACTOR_REQUIRED' } } });
    expect(JSON.stringify(result.body)).not.toMatch(/jwt|must-not-leak/);
  });

  describe('with the refresh routes on', () => {
    const base = readCompatConfig(configStrapi(true));
    const on = { ...base, refresh: { ...base.refresh, enabled: true } };
    const signInWith = (headers: Headers, config = on) =>
      local(strapi, config, { body: { identifier: 'ann@example.com', password: 'x' }, headers });

    it('answers { jwt, refreshToken, user } and no cookie by default', async () => {
      const result = await signInWith(new Headers());

      expect(result.body).toMatchObject({ jwt: 'signed.token', refreshToken: 'signed.token' });
      expect(result.cookies).toBeUndefined();
    });

    it('answers { jwt, user } and the cookie with the header, or with httpOnly configured', async () => {
      const asked = await signInWith(new Headers({ 'x-strapi-refresh-cookie': 'httpOnly' }));
      const configured = await signInWith(new Headers(), {
        ...on,
        refresh: { ...on.refresh, httpOnly: true },
      });

      for (const result of [asked, configured]) {
        expect(result.body).not.toHaveProperty('refreshToken');
        expect(result.cookies).toEqual([
          expect.stringMatching(/^strapi_up_refresh=signed\.token;/),
        ]);
      }
    });

    it('stores the device the body names, and leaves it to the session otherwise', async () => {
      let seen: string | undefined = 'unset';

      callNative.mockImplementationOnce(async () => {
        seen = pendingDevice();

        return {
          headers: new Headers({ 'set-auth-token': 't' }),
          response: { user: { id: 'doc7' } },
        };
      });
      await local(strapi, on, {
        body: { identifier: 'ann@example.com', password: 'x', deviceId: 'phone' },
        headers: new Headers(),
      });

      expect(seen).toBe('phone');

      await signInWith(new Headers());

      expect(pendingDevice()).toBeUndefined();
    });

    it('answers { jwt, user } with the routes off, whatever the request asks', async () => {
      const result = await signInWith(new Headers({ 'x-strapi-refresh-cookie': 'httpOnly' }), cfg);

      expect(result.body).toEqual({ jwt: 'signed.token', user: expect.anything() });
      expect(result.cookies).toBeUndefined();
    });
  });

  it('refuses a body without an identifier or a password', async () => {
    expect((await signIn(undefined)).status).toBe(400);
    expect((await signIn('ann@example.com', '')).status).toBe(400);
    expect(callNative).not.toHaveBeenCalled();
  });

  it('password-policy leaves /local and /local/register to the calls they make', () => {
    const policy = (buildAuthOptions(configStrapi(true)).plugins ?? []).find(
      ({ id }) => id === 'password-policy'
    );
    const matches = (path: string) => policy?.hooks?.before?.[0].matcher({ path } as never);

    expect(matches('/local')).toBe(false);
    expect(matches('/local/register')).toBe(false);
    expect(matches('/sign-in/email')).toBe(false);
    expect(matches('/reset-password')).toBe(true);
  });

  it('declares a rate-limit rule for each compat path and none for the native ones', () => {
    const { rateLimit } = strapiCompat(configStrapi(true), cfg);
    const ruleFor = (path: string) => rateLimit?.find((rule) => rule.pathMatcher(path));

    for (const path of [
      '/local',
      '/local/register',
      '/forgot-password',
      '/send-email-confirmation',
    ]) {
      expect(ruleFor(path), path).toBeDefined();
    }

    expect(ruleFor('/local')).toMatchObject({ max: 5 });

    for (const path of [
      '/sign-in/email',
      '/sign-up/email',
      '/reset-password',
      '/change-password',
    ]) {
      expect(ruleFor(path), path).toBeUndefined();
    }
  });

  it('puts strapi-compat first when compat is on', () => {
    expect(pluginIds(true)[0]).toBe('strapi-compat');
  });

  it('the chain has no strapi-compat plugin when compat is off', () => {
    expect(pluginIds(false)).not.toContain('strapi-compat');
  });
});

describe('strapi-compat register', () => {
  let signUp: { enabled: boolean; requireEmailVerification: boolean };
  let fields: string[];
  let callNative: ReturnType<typeof vi.fn>;
  let findUser: ReturnType<typeof vi.fn>;
  let usernameSeen: Array<string | undefined>;
  let strapi: Core.Strapi;

  const cfg = readCompatConfig(configStrapi(true));
  const base = { username: 'John-Doe', email: 'Ann@Example.com', password: 'Passw0rd!long' };
  const signUpWith = (body: unknown) => register(strapi, cfg, { body, headers: new Headers() });
  const message = (result: { body: unknown }) =>
    (result.body as { error: { message: string } }).error.message;

  beforeEach(() => {
    signUp = { enabled: true, requireEmailVerification: false };
    fields = ['company'];
    usernameSeen = [];
    callNative = vi.fn(async () => {
      usernameSeen.push(pendingUsername());

      return {
        headers: new Headers({ 'set-auth-token': 'signed.token' }),
        response: { token: 'raw', user: { id: 'doc7', email: 'ann@example.com' } },
      };
    });
    findUser = vi.fn(async () => null);
    strapi = {
      db: { query: () => ({ findOne: findUser }) },
      plugin: () => ({
        service(name: string) {
          if (name === 'engine') {
            return { get: () => ({ callNative }) as unknown as AuthEngine };
          }

          if (name === 'role') {
            return {
              getForUser: async () => [
                {
                  id: 1,
                  documentId: 'r1',
                  name: 'Authenticated',
                  description: null,
                  type: 'authenticated',
                },
              ],
            };
          }

          return { get: async () => ({ signUp }), getSignUpFields: async () => fields };
        },
      }),
    } as unknown as Core.Strapi;
  });

  it('refuses unlisted keys with the users-permissions text, deviceId included', async () => {
    const result = await signUpWith({ ...base, deviceId: 'd1', role: 3 });

    expect(result.status).toBe(400);
    expect(message(result)).toBe('Invalid parameters: deviceId, role');
    expect(callNative).not.toHaveBeenCalled();
  });

  it('accepts a Registration field and passes it to the native sign-up', async () => {
    const result = await signUpWith({ ...base, company: 'Acme' });

    expect(result.status).toBe(200);
    expect(callNative).toHaveBeenCalledWith(
      'signUpEmail',
      expect.objectContaining({
        body: expect.objectContaining({ company: 'Acme', email: 'ann@example.com' }),
      })
    );
  });

  it('answers with the same 400 for a taken email and a taken username', async () => {
    findUser.mockResolvedValue({ documentId: 'other' });

    const result = await signUpWith(base);

    expect(result.status).toBe(400);
    expect(message(result)).toBe('Email or Username are already taken');
    expect(findUser).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { $or: [{ email: 'ann@example.com' }, { username: 'john-doe' }] },
      })
    );
    expect(callNative).not.toHaveBeenCalled();
  });

  it('sets name from username, and hands a username the native validator would refuse to the user create', async () => {
    const result = await signUpWith({ ...base, username: 'jo' });

    expect(result.status).toBe(200);
    expect(callNative).toHaveBeenCalledWith(
      'signUpEmail',
      expect.objectContaining({ body: expect.objectContaining({ name: 'jo' }) })
    );
    expect(callNative.mock.calls[0][1].body).not.toHaveProperty('username');
    // The username goes with the user create, through the mark the compat hook reads
    expect(usernameSeen).toEqual(['jo']);
    expect(pendingUsername()).toBeUndefined();
    expect(result.body).toMatchObject({
      jwt: 'signed.token',
      user: { role: { id: 1, name: 'Authenticated' } },
    });
  });

  it('answers { user } with no jwt when verification is required', async () => {
    signUp.requireEmailVerification = true;
    callNative.mockResolvedValueOnce({
      headers: new Headers(),
      response: { token: null, user: { id: 'doc7', email: 'ann@example.com' } },
    });

    const result = await signUpWith(base);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('user');
    expect(result.body).not.toHaveProperty('jwt');
  });

  it('answers Register action is currently disabled when sign-up is off', async () => {
    signUp.enabled = false;

    const result = await signUpWith(base);

    expect(message(result)).toBe('Register action is currently disabled');
    expect(callNative).not.toHaveBeenCalled();
  });

  it('answers an engine refusal with its status and code', async () => {
    callNative.mockRejectedValueOnce(engineError(400, 'PASSWORD_TOO_SHORT'));

    expect(await signUpWith(base)).toMatchObject({
      status: 400,
      body: { error: { details: { code: 'PASSWORD_TOO_SHORT' } } },
    });
  });
});

describe('strapi-compat password and confirmation routes', () => {
  let callNative: ReturnType<typeof vi.fn>;
  let redirects: { emailVerified: string | null; passwordReset: string | null };
  let strapi: Core.Strapi;

  const cfg = readCompatConfig(configStrapi(true));
  const headers = new Headers();
  const message = (result: { body: unknown }) =>
    (result.body as { error: { message: string } }).error.message;

  beforeEach(() => {
    redirects = { emailVerified: null, passwordReset: 'https://app.example.com/reset' };
    callNative = vi.fn(async (endpoint: string) => ({
      headers: new Headers({ 'set-auth-token': 'signed.token' }),
      response:
        endpoint === 'changePassword'
          ? { token: 'raw', user: { id: 'doc7', email: 'ann@example.com' } }
          : { status: true },
    }));
    strapi = {
      db: { query: () => ({ findOne: async () => ({ email: 'ann@example.com' }) }) },
      plugin: () => ({
        service: (name: string) =>
          name === 'engine'
            ? { get: () => ({ callNative }) as unknown as AuthEngine }
            : { get: async () => ({ redirects, methods: { emailPassword: true } }) },
      }),
    } as unknown as Core.Strapi;
  });

  it('routes a body with code to the compat reset and a body with token to the native one', () => {
    expect(isCompatReset({ code: 'c', password: 'p', passwordConfirmation: 'p' })).toBe(true);
    expect(isCompatReset({ token: 't', newPassword: 'p' })).toBe(false);
    expect(isCompatChange({ currentPassword: 'a', password: 'b', passwordConfirmation: 'b' })).toBe(
      true
    );
    expect(isCompatChange({ currentPassword: 'a', newPassword: 'b' })).toBe(false);
  });

  it('treats a body with both code and token, or both passwordConfirmation and newPassword, as native', () => {
    expect(isCompatReset({ code: 'c', token: 't', newPassword: 'p' })).toBe(false);
    expect(isCompatChange({ passwordConfirmation: 'p', newPassword: 'p' })).toBe(false);
    expect(isCompatReset(null)).toBe(false);
    expect(isCompatChange('text')).toBe(false);
  });

  it('answers forgot-password with { ok: true } and passes no redirect to the engine', async () => {
    const result = await forgotPassword(strapi, cfg, {
      body: { email: 'Ann@Example.com' },
      headers,
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
    // The link is built on the settings by the email sender: no redirect goes to the engine
    expect(callNative).toHaveBeenCalledWith(
      'requestPasswordReset',
      expect.objectContaining({ body: { email: 'ann@example.com' } })
    );
  });

  it('refuses forgot-password with another key or no email', async () => {
    const extra = await forgotPassword(strapi, cfg, {
      body: { email: 'ann@example.com', redirectTo: 'https://evil.example' },
      headers,
    });

    expect(extra.status).toBe(400);
    expect(message(extra)).toBe('Invalid parameters: redirectTo');
    expect((await forgotPassword(strapi, cfg, { body: {}, headers })).status).toBe(400);
    expect(callNative).not.toHaveBeenCalled();
  });

  it('refuses mismatched confirmations with the users-permissions text', async () => {
    const result = await changePassword(strapi, cfg, {
      body: { currentPassword: 'old', password: 'one', passwordConfirmation: 'two' },
      headers,
    });

    expect(result.status).toBe(400);
    expect(message(result)).toBe('Passwords do not match');
    expect(callNative).not.toHaveBeenCalled();
  });

  it('changes the password with the native body and answers with the new session token', async () => {
    const result = await changePassword(strapi, cfg, {
      body: { currentPassword: 'old', password: 'new-one', passwordConfirmation: 'new-one' },
      headers,
    });

    expect(callNative).toHaveBeenCalledWith(
      'changePassword',
      expect.objectContaining({
        body: { currentPassword: 'old', newPassword: 'new-one', revokeOtherSessions: true },
      })
    );
    expect(result).toMatchObject({ status: 200, body: { jwt: 'signed.token' } });
  });

  it('answers a wrong current password with the users-permissions text', async () => {
    callNative.mockRejectedValueOnce(engineError(400, 'INVALID_PASSWORD'));

    const result = await changePassword(strapi, cfg, {
      body: { currentPassword: 'x', password: 'new-one', passwordConfirmation: 'new-one' },
      headers,
    });

    expect(message(result)).toBe('The provided current password is invalid');
  });

  it('verifies an address and redirects to the configured URL or /', async () => {
    const query = { confirmation: 'tok' };

    expect(await emailConfirmation(strapi, cfg, { query })).toEqual({
      status: 302,
      body: { location: '/' },
    });
    expect(callNative).toHaveBeenCalledWith(
      'verifyEmail',
      expect.objectContaining({ query: { token: 'tok' } })
    );

    redirects.emailVerified = 'https://app.example.com/welcome';

    expect(await emailConfirmation(strapi, cfg, { query })).toMatchObject({
      body: { location: 'https://app.example.com/welcome' },
    });
  });

  it('answers a bad confirmation token with 400 Invalid token', async () => {
    callNative.mockRejectedValueOnce(engineError(401, 'INVALID_TOKEN'));

    const result = await emailConfirmation(strapi, cfg, { query: { confirmation: 'x' } });

    expect(result.status).toBe(400);
    expect(message(result)).toBe('Invalid token');
  });

  it('answers send-email-confirmation with { email, sent: true }', async () => {
    expect(
      await sendEmailConfirmation(strapi, cfg, { body: { email: 'Ann@Example.com' } })
    ).toEqual({ status: 200, body: { email: 'ann@example.com', sent: true } });
    expect(callNative).toHaveBeenCalledWith(
      'sendVerificationEmail',
      expect.objectContaining({ body: { email: 'ann@example.com' } })
    );
  });

  it('calls the engine for a confirmation with no credentials of the caller', async () => {
    await sendEmailConfirmation(strapi, cfg, { body: { email: 'ann@example.com' } });
    await emailConfirmation(strapi, cfg, { query: { confirmation: 'tok' } });

    for (const [, input] of callNative.mock.calls) {
      expect([...(input.headers as Headers).keys()]).toEqual([]);
    }
  });

  describe('the sign-in after a reset', () => {
    const resetBody = { code: 'c', password: 'new-one', passwordConfirmation: 'new-one' };
    const run = () =>
      resetPassword(strapi, cfg, { body: resetBody, headers, userOfCode: async () => 'doc7' });

    it('answers 403 TWO_FACTOR_REQUIRED and no jwt for a user with a second factor', async () => {
      callNative.mockImplementation(async (endpoint: string) => ({
        headers: new Headers(),
        response: endpoint === 'signInEmail' ? { twoFactorRedirect: true } : { status: true },
      }));

      expect(await run()).toMatchObject({
        status: 403,
        body: { error: { details: { code: 'TWO_FACTOR_REQUIRED' } } },
      });
    });

    it('answers the unconfirmed-address text when the sign-in refuses the user', async () => {
      callNative.mockImplementation(async (endpoint: string) => {
        if (endpoint === 'signInEmail') {
          throw engineError(403, 'EMAIL_NOT_VERIFIED');
        }

        return { headers: new Headers(), response: { status: true } };
      });

      const result = await run();

      expect(result.status).toBe(400);
      expect(message(result)).toBe('Your account email is not confirmed');
    });

    it('fails when the sign-in gives no session token', async () => {
      callNative.mockImplementation(async () => ({
        headers: new Headers(),
        response: { status: true },
      }));

      await expect(run()).rejects.toThrow('The sign-in did not give a session token.');
    });
  });
});

describe('strapi-compat reset, through the engine', () => {
  const STRONG = 'Str0ng!Passw0rd';
  let seen: Array<Record<string, unknown>>;

  // Stands in for lockout: a hook after `strapi-compat` that reads what the request carries
  const probe = (): BetterAuthPlugin => ({
    id: 'probe',
    hooks: {
      before: [
        {
          matcher: (context) => context.path === '/reset-password',
          handler: createAuthMiddleware(async (ctx) => {
            seen.push({ ...(ctx.body as Record<string, unknown>) });
          }),
        },
      ],
    },
  });

  const build = (
    extra: { background?: boolean; sender?: (token: string) => Promise<void> } = {}
  ) => {
    const db = { user: [], session: [], account: [], verification: [] } as Record<string, any[]>;
    const tokens: string[] = [];
    let engine: AuthEngine;

    const policy = { minLength: 8, maxLength: 128, requireMixedClasses: true };
    const strapi = {
      db: {
        query: () => ({
          findOne: async ({ where }: { where: { documentId: string } }) =>
            db.user.find((user) => user.id === where.documentId) ?? null,
        }),
      },
      plugin: () => ({
        service: (name: string) =>
          name === 'engine'
            ? { get: () => engine }
            : {
                get: async () => ({
                  passwords: policy,
                  redirects: {},
                  methods: { emailPassword: true },
                }),
              },
      }),
    } as unknown as Core.Strapi;

    const auth = betterAuth({
      secret: SECRET,
      baseURL: 'http://localhost:1337',
      basePath: '/api/auth',
      telemetry: { enabled: false },
      database: memoryAdapter(db),
      emailAndPassword: {
        enabled: true,
        async sendResetPassword({ token }: { token: string }) {
          tokens.push(token);
          await extra.sender?.(token);
        },
      },
      ...(extra.background
        ? { advanced: { backgroundTasks: { handler: backgroundTaskHandler(strapi) } } }
        : {}),
      plugins: [
        strapiCompat(strapi, readCompatConfig(configStrapi(true))),
        probe(),
        passwordPolicy(strapi),
        username(),
        bearer(),
      ],
    });

    engine = {
      async callNative(endpoint: string, input: Record<string, unknown>) {
        const call = (auth.api as unknown as Record<string, (c: unknown) => Promise<unknown>>)[
          endpoint
        ];

        return (await call({ ...input, returnHeaders: true })) as never;
      },
    } as unknown as AuthEngine;

    const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
      auth.handler(
        new Request(`http://localhost:1337/api/auth${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        })
      );

    return { auth, post, tokens, db, strapi };
  };

  beforeEach(() => {
    seen = [];
  });

  it('lockout and the password policy see the native body on the inner call', async () => {
    const { auth, post, tokens } = build();

    await auth.api.signUpEmail({
      body: { email: 'ann@example.com', password: 'Old-Passw0rd!x', name: 'Ann' },
    });
    await auth.api.requestPasswordReset({ body: { email: 'ann@example.com' } });

    const [code] = tokens;
    const weak = await post('/reset-password', {
      code,
      password: 'alllowercase1',
      passwordConfirmation: 'alllowercase1',
    });

    // The policy refused the password of the inner, native call...
    expect(weak.status).toBe(400);
    expect(await weak.json()).toMatchObject({ error: { details: { code: 'PASSWORD_TOO_WEAK' } } });
    // ...and the hooks after the compat one saw the native body, never the compat one
    expect(seen).toEqual([{ token: code, newPassword: 'alllowercase1' }]);

    const reset = await post('/reset-password', {
      code,
      password: STRONG,
      passwordConfirmation: STRONG,
    });
    const answer = (await reset.json()) as { jwt: string; user: unknown };

    expect(reset.status).toBe(200);
    expect(answer.jwt).toEqual(expect.any(String));
    expect(answer.user).toBeDefined();
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual({ token: code, newPassword: STRONG });

    const signedIn = await auth.api.signInEmail({
      body: { email: 'ann@example.com', password: STRONG },
    });

    expect(signedIn.token).toEqual(expect.any(String));
  });

  it('answers a code that is not one with the users-permissions text', async () => {
    const { post } = build();
    const response = await post('/reset-password', {
      code: 'nope',
      password: STRONG,
      passwordConfirmation: STRONG,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { name: 'ApplicationError', message: 'Incorrect code provided' },
    });
  });

  it('leaves a body with both code and token to the native route', async () => {
    const { post } = build();
    const response = await post('/reset-password', {
      code: 'c',
      token: 'bad',
      newPassword: STRONG,
    });

    // Better Auth's own refusal, not the users-permissions envelope
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'INVALID_TOKEN' });
    expect(seen).toEqual([{ code: 'c', token: 'bad', newPassword: STRONG }]);
  });

  it('answers a compat change-password body with { jwt, user } and leaves a native one alone', async () => {
    const { auth, post } = build();
    const signedUp = await auth.api.signUpEmail({
      body: { email: 'ann@example.com', password: 'Old-Passw0rd!x', name: 'Ann' },
      returnHeaders: true,
    });
    const cookie = signedUp.headers.get('set-cookie') ?? '';
    const authed = { cookie: cookie.split(';')[0] };

    const compat = await post(
      '/change-password',
      { currentPassword: 'Old-Passw0rd!x', password: STRONG, passwordConfirmation: STRONG },
      authed
    );
    const answer = (await compat.json()) as { jwt: string };

    expect(compat.status).toBe(200);
    expect(answer).toMatchObject({ jwt: expect.any(String), user: expect.anything() });

    // The other sessions were revoked, so the next calls carry the new one
    const renewed = { authorization: `Bearer ${answer.jwt}` };

    // A native body goes to the native endpoint untouched, which answers its own shape
    const native = await post(
      '/change-password',
      { currentPassword: STRONG, newPassword: 'An0ther!Passw0rd' },
      renewed
    );

    expect(native.status).toBe(200);
    expect(await native.json()).not.toHaveProperty('jwt');

    // With both shapes in one body, `newPassword` makes it native
    const both = await post(
      '/change-password',
      { currentPassword: 'x', newPassword: 'y', passwordConfirmation: 'y' },
      renewed
    );

    expect(await both.json()).not.toHaveProperty('jwt');
  });

  it('writes the username of a compat registration in the same user create', async () => {
    const { auth, db } = build();

    await withPendingUsername('jo', () =>
      auth.api.signUpEmail({
        body: { email: 'jo@example.com', password: 'Old-Passw0rd!x', name: 'jo' },
      })
    );

    expect(db.user).toHaveLength(1);
    expect(db.user[0]).toMatchObject({ email: 'jo@example.com', username: 'jo' });

    await auth.api.signUpEmail({
      body: { email: 'other@example.com', password: 'Old-Passw0rd!x', name: 'Other' },
    });

    // Outside the compat route nothing sets one
    expect(db.user[1].username ?? null).toBeNull();
  });

  it('answers /forgot-password before the reset email has been sent, and a failed send does not fail it', async () => {
    let finish: () => void = () => undefined;
    const sending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let sent = false;
    const { auth, post, tokens } = build({
      background: true,
      async sender() {
        await sending;
        sent = true;
      },
    });

    await auth.api.signUpEmail({
      body: { email: 'ann@example.com', password: 'Old-Passw0rd!x', name: 'Ann' },
    });

    const response = await post('/forgot-password', { email: 'ann@example.com' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    // The send had started and had not finished when the answer came
    expect(tokens).toHaveLength(1);
    expect(sent).toBe(false);

    finish();
    await sending;
    await Promise.resolve();
    expect(sent).toBe(true);

    const failing = build({
      background: true,
      async sender() {
        throw new Error('smtp down');
      },
    });

    await failing.auth.api.signUpEmail({
      body: { email: 'bob@example.com', password: 'Old-Passw0rd!x', name: 'Bob' },
    });

    const refused = await failing.post('/forgot-password', { email: 'bob@example.com' });

    expect(refused.status).toBe(200);
  });
});

describe('the engine options', () => {
  it('detaches background work and revokes sessions on a password reset', () => {
    const options = buildAuthOptions(configStrapi(true));

    expect(options.advanced?.backgroundTasks?.handler).toEqual(expect.any(Function));
    expect(options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
  });

  it('logs a background task that fails', async () => {
    const strapi = configStrapi(true);

    backgroundTaskHandler(strapi)(Promise.reject(new Error('mail down')));
    await vi.waitFor(() =>
      expect(strapi.log.error).toHaveBeenCalledWith(expect.stringContaining('mail down'))
    );
  });
});

describe('strapi-compat refresh routes, through the engine', () => {
  const PASSWORD = 'Old-Passw0rd!x';
  const CHROME =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const build = (enabled = true) => {
    const db = { user: [], session: [], account: [], verification: [] } as Record<string, any[]>;
    const base = readCompatConfig(configStrapi(true));
    const cfg = { ...base, refresh: { ...base.refresh, enabled } };
    let engine: AuthEngine;
    const strapi = {
      log: { error: vi.fn() },
      sessionManager: Object.assign(() => ({}), { hasOrigin: () => false }),
      plugin: () => ({ service: () => ({ get: () => engine }) }),
    } as unknown as Core.Strapi;

    const auth = betterAuth({
      secret: SECRET,
      baseURL: 'http://localhost:1337',
      basePath: '/api/auth',
      telemetry: { enabled: false },
      database: memoryAdapter(db),
      emailAndPassword: { enabled: true },
      plugins: [strapiCompat(strapi, cfg), bearer()],
    });

    const toSession = (row: any) => ({
      id: row.id,
      userId: row.userId,
      token: row.token,
      expiresAt: row.expiresAt,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      deviceId: row.deviceId ?? null,
      impersonatedBy: row.impersonatedBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    const internal = async () => (await auth.$context).internalAdapter;

    engine = {
      async getSession(headers: Headers) {
        const found = await auth.api
          .getSession({ headers, query: { disableCookieCache: true } })
          .catch(() => null);

        return found?.session ? toSession(found.session) : null;
      },
      async createSession(userId: string, meta: Record<string, unknown>) {
        return toSession(await (await internal()).createSession(userId, false, meta as never));
      },
      async revokeSession(userId: string, sessionId: string) {
        const row = (await (await internal()).listSessions(userId)).find((s) => s.id === sessionId);

        if (!row) {
          throw new errors.NotFoundError('Session not found');
        }

        await (await internal()).deleteSession(row.token);
      },
      async claimSession(userId: string, sessionId: string) {
        const row = (await (await internal()).listSessions(userId)).find((s) => s.id === sessionId);

        if (!row) {
          return null;
        }

        const removed = await (
          await auth.$context
        ).adapter.deleteMany({
          model: 'session',
          where: [
            { field: 'id', value: sessionId },
            { field: 'userId', value: userId },
          ],
        });

        return removed === 1 ? toSession(row) : null;
      },
      async revokeSessions(userId: string) {
        await (await internal()).deleteUserSessions(userId);
      },
      async revokeDevice(userId: string, deviceId: string) {
        const rows = (await (await internal()).listSessions(userId)).filter(
          (row: any) => row.deviceId === deviceId
        );

        await (await internal()).deleteSessions(rows.map((row) => row.token));
      },
      async listSessions(userId: string) {
        return (await (await internal()).listSessions(userId)).map(toSession);
      },
    } as unknown as AuthEngine;

    const call = (
      method: string,
      path: string,
      {
        token,
        body,
        headers = {},
      }: { token?: string; body?: unknown; headers?: Record<string, string> } = {}
    ) =>
      auth.handler(
        new Request(`http://localhost:1337/api/auth${path}`, {
          method,
          headers: {
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
      );

    /** A sign-in on a device: the session token the compat route would hand out */
    const signIn = async (email: string, deviceId: string, userAgent?: string) => {
      const exists = db.user.some((user) => user.email === email);
      const headers = userAgent ? new Headers({ 'user-agent': userAgent }) : new Headers();
      const run = () =>
        exists
          ? auth.api.signInEmail({
              body: { email, password: PASSWORD },
              headers,
              returnHeaders: true,
            })
          : auth.api.signUpEmail({
              body: { email, password: PASSWORD, name: 'Ann' },
              headers,
              returnHeaders: true,
            });
      const answered = await withPendingDevice(deviceId, run);

      return answered.headers.get('set-auth-token') as string;
    };

    return { db, call, signIn, auth, engine, cfg, strapi };
  };

  const bodyOf = async (response: Response) => (await response.json()) as Record<string, any>;

  it('rotates on refresh and refuses a replayed token with 401', async () => {
    const { call, signIn } = build();
    const first = await signIn('ann@example.com', 'device-a');

    const rotated = await call('POST', '/refresh', { body: { refreshToken: first } });
    const answer = await bodyOf(rotated);

    expect(rotated.status).toBe(200);
    expect(answer.jwt).toEqual(expect.any(String));
    expect(answer.refreshToken).toBe(answer.jwt);
    expect(answer.jwt).not.toBe(first);

    const replay = await call('POST', '/refresh', { body: { refreshToken: first } });

    expect(replay.status).toBe(401);
    expect(await bodyOf(replay)).toMatchObject({ error: { message: 'Invalid refresh token' } });
    // The new token is a session token: it signs the caller in
    expect((await call('GET', '/sessions', { token: answer.jwt })).status).toBe(200);
  });

  it('lets one of five refreshes with the same token win, and leaves one session', async () => {
    const { call, signIn, db } = build();
    const first = await signIn('ann@example.com', 'device-a');

    const answers = await Promise.all(
      Array.from({ length: 5 }, () => call('POST', '/refresh', { body: { refreshToken: first } }))
    );

    expect(answers.map((answer) => answer.status).sort()).toEqual([200, 401, 401, 401, 401]);
    expect(db.session).toHaveLength(1);
    expect(db.session[0]).toMatchObject({ deviceId: 'device-a' });
  });

  it('does not rotate the session of an impersonation', async () => {
    const { call, signIn, db, engine } = build();
    const first = await signIn('ann@example.com', 'device-a');
    const lookup = engine.getSession.bind(engine);

    // The test engine has no admin plugin, so its sessions carry no marker of their own
    engine.getSession = async (headers) => {
      const found = await lookup(headers);

      return found && { ...found, impersonatedBy: 'admin-1' };
    };

    expect((await call('POST', '/refresh', { body: { refreshToken: first } })).status).toBe(401);
    expect(db.session).toHaveLength(1);
  });

  it('keeps the device across a rotation and answers 400 when there is no token', async () => {
    const { call, signIn, db } = build();
    const first = await signIn('ann@example.com', 'device-a');
    const answer = await bodyOf(await call('POST', '/refresh', { body: { refreshToken: first } }));

    expect(db.session).toHaveLength(1);
    expect(db.session[0]).toMatchObject({ deviceId: 'device-a' });
    expect(answer.jwt).toEqual(expect.any(String));

    const none = await call('POST', '/refresh', { body: {} });

    expect(none.status).toBe(400);
    expect(await bodyOf(none)).toMatchObject({ error: { message: 'Missing refresh token' } });
    expect((await call('POST', '/refresh', { body: { refreshToken: 'nope' } })).status).toBe(401);
  });

  it('answers { jwt } and the cookie when the request asks for one', async () => {
    const { call, signIn } = build();
    const first = await signIn('ann@example.com', 'device-a');
    const response = await call('POST', '/refresh', {
      body: { refreshToken: first },
      headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
    });
    const answer = await bodyOf(response);

    expect(answer).not.toHaveProperty('refreshToken');
    expect(response.headers.getSetCookie().join('\n')).toMatch(/^strapi_up_refresh=.*HttpOnly/);
  });

  it('refreshes from the cookie, which wins over the body', async () => {
    const { call, signIn } = build();
    const token = await signIn('ann@example.com', 'device-a');
    const response = await call('POST', '/refresh', {
      body: { refreshToken: 'not-a-token' },
      headers: { cookie: `strapi_up_refresh=${encodeURIComponent(token)}` },
    });

    expect(response.status).toBe(200);
  });

  it('logout by scope all, by deviceId and by current session revokes the right ones', async () => {
    const { call, signIn, db } = build();
    const phone = await signIn('ann@example.com', 'phone');
    const laptop = await signIn('ann@example.com', 'laptop');
    const tablet = await signIn('ann@example.com', 'tablet');

    expect(
      (await call('POST', '/logout', { token: phone, body: { deviceId: 'laptop' } })).status
    ).toBe(200);
    expect(db.session.map((row) => row.deviceId).sort()).toEqual(['phone', 'tablet']);
    expect((await call('GET', '/sessions', { token: laptop })).status).toBe(401);

    const current = await call('POST', '/logout', { token: tablet, body: {} });

    expect(await bodyOf(current)).toEqual({ ok: true });
    expect(db.session.map((row) => row.deviceId)).toEqual(['phone']);

    await signIn('ann@example.com', 'watch');
    await call('POST', '/logout', { token: phone, body: { scope: 'all' } });

    expect(db.session).toHaveLength(0);
  });

  it('logout clears the cookie only when the request asks for it, and needs a signed-in caller', async () => {
    const { call, signIn } = build();
    const token = await signIn('ann@example.com', 'phone');

    expect((await call('POST', '/logout', { body: {} })).status).toBe(401);

    const plain = await call('POST', '/logout', { token, body: {} });

    expect(plain.headers.getSetCookie()).toEqual([]);

    const again = await signIn('ann@example.com', 'phone');
    const asked = await call('POST', '/logout', {
      token: again,
      body: {},
      headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
    });

    expect(asked.headers.getSetCookie().join('')).toMatch(/^strapi_up_refresh=;/);

    // A request that carries the cookie clears it, whether or not it asked for one
    const carried = await signIn('ann@example.com', 'phone');
    const cleared = await call('POST', '/logout', {
      token: carried,
      body: {},
      headers: { cookie: 'strapi_up_refresh=whatever' },
    });

    expect(cleared.headers.getSetCookie().join('')).toMatch(/^strapi_up_refresh=;/);
  });

  it('lists sessions with current set for the caller and deviceName from the user agent', async () => {
    const { call, signIn } = build();
    const phone = await signIn('ann@example.com', 'phone', CHROME);
    await signIn('ann@example.com', 'laptop');
    await signIn('bob@example.com', 'other');

    const listed = await bodyOf(await call('GET', '/sessions', { token: phone }));

    expect(listed.data).toHaveLength(2);
    expect(listed.data[0]).toMatchObject({
      deviceId: 'phone',
      deviceName: 'Chrome on macOS',
      current: true,
      loginAt: expect.any(String),
      lastActiveAt: expect.any(String),
    });
    expect(listed.data[1]).toMatchObject({ deviceId: 'laptop', current: false });
    expect(JSON.stringify(listed)).not.toContain(phone);
    expect((await call('GET', '/sessions')).status).toBe(401);
  });

  it("revokes one session by id and answers Session not found for another user's", async () => {
    const { call, signIn } = build();
    const phone = await signIn('ann@example.com', 'phone');
    await signIn('ann@example.com', 'laptop');
    const other = await signIn('bob@example.com', 'other');

    const { data } = await bodyOf(await call('GET', '/sessions', { token: phone }));
    const laptop = data.find((entry: { deviceId: string }) => entry.deviceId === 'laptop');
    const bobs = (await bodyOf(await call('GET', '/sessions', { token: other }))).data[0];

    const foreign = await call('DELETE', `/sessions/${bobs.id}`, { token: phone });

    expect(foreign.status).toBe(404);
    expect(await bodyOf(foreign)).toMatchObject({ error: { message: 'Session not found' } });

    const revoked = await call('DELETE', `/sessions/${laptop.id}`, { token: phone });

    expect(revoked.status).toBe(200);
    expect(await bodyOf(revoked)).toEqual({ data: {} });
    expect((await bodyOf(await call('GET', '/sessions', { token: phone }))).data).toHaveLength(1);
  });

  it('gives every session a device: the one named, or a new one', async () => {
    const { auth, db } = build();

    await withPendingDevice('named', () =>
      auth.api.signUpEmail({ body: { email: 'a@example.com', password: PASSWORD, name: 'A' } })
    );
    await auth.api.signUpEmail({ body: { email: 'b@example.com', password: PASSWORD, name: 'B' } });

    expect(db.session[0].deviceId).toBe('named');
    expect(db.session[1].deviceId).toEqual(expect.any(String));
    expect(db.session[1].deviceId).not.toBe('named');
  });

  it('answers 404 on all four routes with refresh off, and the routes do not exist with compat off', async () => {
    const off = build(false);
    const token = await off.signIn('ann@example.com', 'phone');

    for (const [method, path] of [
      ['POST', '/refresh'],
      ['POST', '/logout'],
      ['GET', '/sessions'],
      ['DELETE', '/sessions/anything'],
    ]) {
      const response = await off.call(method, path, {
        token,
        body: method === 'POST' ? {} : undefined,
      });

      expect(response.status, `${method} ${path}`).toBe(404);
    }

    const options = buildAuthOptions(configStrapi(false));
    const compat = strapiCompat(configStrapi(true), readCompatConfig(configStrapi(true)));

    expect((options.plugins ?? []).map((plugin) => plugin.id)).not.toContain('strapi-compat');
    expect(Object.keys(compat.endpoints ?? {})).toEqual(
      expect.arrayContaining([
        'compatRefresh',
        'compatLogout',
        'compatSessions',
        'compatRevokeSession',
      ])
    );
    expect(compat.schema?.session?.fields).toHaveProperty('deviceId');
  });
});

describe('strapi-compat refresh, with an old refresh token', () => {
  const setup = (
    overrides: {
      cutover?: unknown;
      valid?: boolean;
      until?: boolean;
      createdAt?: Date;
      claimed?: number;
    } = {}
  ) => {
    const base = readCompatConfig(configStrapi(true));
    const cfg = {
      ...base,
      refresh: { ...base.refresh, enabled: true },
      legacyJwt: {
        ...base.legacyJwt,
        until: overrides.until === false ? null : new Date(Date.now() + 86_400_000),
      },
    };
    const manager = {
      validateRefreshToken: vi.fn(async () =>
        overrides.valid === false
          ? { isValid: false }
          : { isValid: true, userId: '7', sessionId: 'old-session' }
      ),
      listSessions: vi.fn(async () => [
        {
          sessionId: 'old-session',
          deviceId: 'old-device',
          createdAt: overrides.createdAt ?? new Date(Date.now() - 3_600_000),
        },
      ]),
    };
    const deleteMany = vi.fn(async () => ({ count: overrides.claimed ?? 1 }));
    const engine = {
      getSession: vi.fn(async () => null),
      createSession: vi.fn(async () => ({ id: 's2', userId: 'doc7', token: 'new-token' })),
      revokeSession: vi.fn(),
    };
    const strapi = {
      sessionManager: Object.assign(() => manager, { hasOrigin: () => true }),
      store: () => ({
        get: async () =>
          'cutover' in overrides
            ? overrides.cutover
            : { status: 'completed', cutoverAt: new Date().toISOString() },
      }),
      db: { query: () => ({ findOne: async () => ({ documentId: 'doc7' }), deleteMany }) },
      plugin: () => ({ service: () => ({ get: () => engine }) }),
    } as unknown as Core.Strapi;

    return { cfg, manager, engine, strapi, deleteMany };
  };

  const run = (ctx: ReturnType<typeof setup>) =>
    refresh(ctx.strapi, ctx.cfg, {
      body: { refreshToken: 'old.refresh.token' },
      headers: new Headers(),
    });

  it('exchanges an old refresh token for a session that keeps its deviceId, and revokes the old one', async () => {
    const ctx = setup();
    const result = await run(ctx);

    expect(result).toMatchObject({
      status: 200,
      body: { jwt: 'new-token', refreshToken: 'new-token' },
    });
    expect(ctx.engine.createSession).toHaveBeenCalledWith(
      'doc7',
      expect.objectContaining({ deviceId: 'old-device' })
    );
    expect(ctx.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'old-session', userId: '7', origin: expect.any(String) },
    });
  });

  it('refuses one that is not valid, one issued after the cutover, and any without a completed migration', async () => {
    for (const ctx of [
      setup({ valid: false }),
      setup({ cutover: null }),
      setup({ cutover: { status: 'running', cutoverAt: new Date().toISOString() } }),
      setup({ until: false }),
    ]) {
      expect((await run(ctx)).status).toBe(401);
      expect(ctx.engine.createSession).not.toHaveBeenCalled();
    }

    // Made after the cutover, which is when the migration was recorded: not one of the old tokens
    const late = setup({ createdAt: new Date(Date.now() + 3_600_000) });

    expect((await run(late)).status).toBe(401);
    expect(late.engine.createSession).not.toHaveBeenCalled();
  });

  it('makes no new session when another request claimed the old one first', async () => {
    const ctx = setup({ claimed: 0 });

    expect((await run(ctx)).status).toBe(401);
    expect(ctx.engine.createSession).not.toHaveBeenCalled();
  });
});
