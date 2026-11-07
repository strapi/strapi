import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { local } from '../../../compat/endpoints/local';
import { readCompatConfig } from '../../../compat/config';
import { buildAuthOptions } from '../create-engine';
import type { AuthEngine } from '../../types';
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

  const cfg = readCompatConfig(configStrapi(true));
  const signIn = (identifier: unknown, password: unknown = 'Passw0rd!long') =>
    local(strapi, cfg, { body: { identifier, password }, headers: new Headers() });

  beforeEach(() => {
    methods = { emailPassword: true, username: true };
    callNative = vi.fn(async () => ({
      headers: new Headers({ 'set-auth-token': 'signed.token' }),
      response: { token: 'raw', user: { id: 'doc7', email: 'ann@example.com' } },
    }));
    strapi = {
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

    await signIn('Ann_B');

    expect(callNative).toHaveBeenLastCalledWith(
      'signInUsername',
      expect.objectContaining({ body: { username: 'ann_b', password: 'Passw0rd!long' } })
    );
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

  it('keeps a locked account as the engine answered it', async () => {
    const locked = engineError(403, 'ACCOUNT_LOCKED');

    callNative.mockRejectedValueOnce(locked);

    await expect(signIn('ann@example.com')).rejects.toBe(locked);
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
