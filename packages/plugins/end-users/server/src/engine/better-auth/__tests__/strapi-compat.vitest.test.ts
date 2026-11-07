import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthMiddleware } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { bearer } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { local } from '../../../compat/endpoints/local';
import { emailConfirmation, sendEmailConfirmation } from '../../../compat/endpoints/confirmation';
import {
  changePassword,
  forgotPassword,
  isCompatChange,
  isCompatReset,
} from '../../../compat/endpoints/passwords';
import { register } from '../../../compat/endpoints/register';
import { readCompatConfig } from '../../../compat/config';
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

  it('refuses a body without an identifier or a password', async () => {
    expect((await signIn(undefined)).status).toBe(400);
    expect((await signIn('ann@example.com', '')).status).toBe(400);
    expect(callNative).not.toHaveBeenCalled();
  });

  it('password-policy does not treat /local as a setter', () => {
    const policy = (buildAuthOptions(configStrapi(true)).plugins ?? []).find(
      ({ id }) => id === 'password-policy'
    );
    const matches = (path: string) => policy?.hooks?.before?.[0].matcher({ path } as never);

    expect(matches('/local')).toBe(false);
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
  let updateUser: ReturnType<typeof vi.fn>;
  let strapi: Core.Strapi;

  const cfg = readCompatConfig(configStrapi(true));
  const base = { username: 'John-Doe', email: 'Ann@Example.com', password: 'Passw0rd!long' };
  const signUpWith = (body: unknown) => register(strapi, cfg, { body, headers: new Headers() });
  const message = (result: { body: unknown }) =>
    (result.body as { error: { message: string } }).error.message;

  beforeEach(() => {
    signUp = { enabled: true, requireEmailVerification: false };
    fields = ['company'];
    callNative = vi.fn(async () => ({
      headers: new Headers({ 'set-auth-token': 'signed.token' }),
      response: { token: 'raw', user: { id: 'doc7', email: 'ann@example.com' } },
    }));
    findUser = vi.fn(async () => null);
    updateUser = vi.fn(async () => ({}));
    strapi = {
      db: { query: () => ({ findOne: findUser, update: updateUser }) },
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

  it('sets name from username, and stores a username the native validator would refuse', async () => {
    const result = await signUpWith({ ...base, username: 'jo' });

    expect(result.status).toBe(200);
    expect(callNative).toHaveBeenCalledWith(
      'signUpEmail',
      expect.objectContaining({ body: expect.objectContaining({ name: 'jo' }) })
    );
    expect(callNative.mock.calls[0][1].body).not.toHaveProperty('username');
    expect(updateUser).toHaveBeenCalledWith({
      where: { documentId: 'doc7' },
      data: { username: 'jo' },
    });
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
            : { get: async () => ({ redirects }) },
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

  it('answers forgot-password with { ok: true } and the reset base of the settings', async () => {
    const result = await forgotPassword(strapi, cfg, {
      body: { email: 'Ann@Example.com' },
      headers,
    });

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(callNative).toHaveBeenCalledWith(
      'requestPasswordReset',
      expect.objectContaining({
        body: { email: 'ann@example.com', redirectTo: 'https://app.example.com/reset' },
      })
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

    expect(await emailConfirmation(strapi, cfg, { query, headers })).toEqual({
      status: 302,
      body: { location: '/' },
    });
    expect(callNative).toHaveBeenCalledWith(
      'verifyEmail',
      expect.objectContaining({ query: { token: 'tok' } })
    );

    redirects.emailVerified = 'https://app.example.com/welcome';

    expect(await emailConfirmation(strapi, cfg, { query, headers })).toMatchObject({
      body: { location: 'https://app.example.com/welcome' },
    });
  });

  it('answers a bad confirmation token with 400 Invalid token', async () => {
    callNative.mockRejectedValueOnce(engineError(401, 'INVALID_TOKEN'));

    const result = await emailConfirmation(strapi, cfg, { query: { confirmation: 'x' }, headers });

    expect(result.status).toBe(400);
    expect(message(result)).toBe('Invalid token');
  });

  it('answers send-email-confirmation with { email, sent: true }', async () => {
    expect(
      await sendEmailConfirmation(strapi, cfg, { body: { email: 'Ann@Example.com' }, headers })
    ).toEqual({ status: 200, body: { email: 'ann@example.com', sent: true } });
    expect(callNative).toHaveBeenCalledWith(
      'sendVerificationEmail',
      expect.objectContaining({ body: { email: 'ann@example.com' } })
    );
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

  const build = () => {
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
            : { get: async () => ({ passwords: policy, redirects: {} }) },
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
        },
      },
      plugins: [
        strapiCompat(strapi, readCompatConfig(configStrapi(true))),
        probe(),
        passwordPolicy(strapi),
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

    const post = (path: string, body: unknown) =>
      auth.handler(
        new Request(`http://localhost:1337/api/auth${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      );

    return { auth, post, tokens };
  };

  beforeEach(() => {
    seen = [];
  });

  it('the reset rewrite is what lockout and the password policy read', async () => {
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
});
