import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { koaCtx } from '../../engine/better-auth/__tests__/utils/koa-ctx';
import { endpointAllowlist } from '../endpoint-allowlist';

const ALL_ON = {
  emailPassword: true,
  username: true,
  twoFactor: true,
  magicLink: true,
  emailOtp: true,
  passkey: true,
};

const strapiWith = (values: Record<string, unknown> = {}, methods: Record<string, boolean> = {}) =>
  ({
    config: { get: (path: string) => values[path] },
    plugin: () => ({
      service: () => ({ get: async () => ({ methods: { ...ALL_ON, ...methods } }) }),
    }),
  }) as unknown as Core.Strapi;

/** Runs the middleware on a request target: whether it let the request through, or answered 404. */
const run = async (
  target: string,
  config: Record<string, unknown> = {},
  methods: Record<string, boolean> = {}
) => {
  const middleware = endpointAllowlist(
    {},
    { strapi: strapiWith(config, methods) }
  ) as Core.MiddlewareHandler;
  const ctx = koaCtx({ url: target });
  const notFound = vi.fn();
  const next = vi.fn().mockResolvedValue(undefined);

  Object.assign(ctx, { notFound });

  await middleware(ctx, next);

  return { passed: next.mock.calls.length === 1, notFound: notFound.mock.calls.length === 1 };
};

describe('endpointAllowlist', () => {
  describe('lets through the endpoints Better Auth serves for the plugins that are on', () => {
    it.each([
      '/api/auth/sign-in/email',
      '/api/auth/sign-up/email',
      '/api/auth/get-session',
      '/api/auth/sign-in/username',
      '/api/auth/two-factor/verify-totp',
      '/api/auth/ok',
      '/api/auth/get-session?disableCookieCache=true',
      '/api/auth/reset-password/some-token?callbackURL=https%3A%2F%2Fapp.example.com',
      // a name that only starts like the blocked one is another endpoint
      '/api/auth/administrator/list',
      '/api/auth/x/admin',
    ])('%s', async (target) => {
      expect(await run(target)).toEqual({ passed: true, notFound: false });
    });
  });

  describe('answers 404 to every endpoint of the admin plugin, however the path is spelled', () => {
    it.each([
      '/api/auth/admin/list-users',
      '/api/auth/admin/list-users/',
      '/api/auth/admin/list-users?limit=1',
      '/api/auth/admin/create-user',
      '/api/auth/admin/set-role',
      '/api/auth/admin/ban-user',
      '/api/auth/admin/impersonate-user',
      '/api/auth/admin/stop-impersonating',
      '/api/auth/admin',
      '/api/auth/admin/',
      '/api/auth/Admin/list-users',
      '/api/auth/ADMIN/list-users',
      // the Fetch API resolves dot segments, so these are `/api/auth/admin/...` to Better Auth
      '/api/auth/./admin/list-users',
      '/api/auth/x/../admin/list-users',
      '/api/auth/x/%2e%2e/admin/list-users',
      '/api/auth/x/%2E%2E/admin/list-users',
      '/api/auth/x/.%2e/admin/list-users',
      '/api/auth/./././admin/list-users',
      '/api/auth/admin/../admin/list-users',
      '/api/auth/%61dmin/list-users',
      '/api/auth/%41dmin/list-users',
      '/api/auth//admin/list-users',
      '/api/auth/admin//list-users',
      '/api/auth/admin%2flist-users',
      '/api/auth/admin\\list-users',
    ])('%s', async (target) => {
      const { passed } = await run(target);

      expect(passed).toBe(false);
    });

    it('with the 404 helper of the Content API, not a made-up response', async () => {
      expect(await run('/api/auth/admin/list-users')).toEqual({ passed: false, notFound: true });
    });
  });

  it('answers 404 to a path outside the base path, which Better Auth would not serve either', async () => {
    expect(await run('/api/auth')).toMatchObject({ passed: false });
    expect(await run('/api/other')).toMatchObject({ passed: false });
    expect(await run('/api/auth/../users')).toMatchObject({ passed: false });
    expect(await run('/auth/sign-in/email')).toMatchObject({ passed: false });
  });

  it('follows the REST prefix the application is configured with', async () => {
    const config = { 'api.rest.prefix': '/v1' };

    expect(await run('/v1/auth/sign-in/email', config)).toMatchObject({ passed: true });
    expect(await run('/v1/auth/admin/list-users', config)).toMatchObject({ passed: false });
    expect(await run('/api/auth/sign-in/email', config)).toMatchObject({ passed: false });
  });

  describe('answers 404 to the endpoints of a method an administrator turned off', () => {
    it('404s the endpoints of /sign-in/username when methods.username is off', async () => {
      expect(await run('/api/auth/sign-in/username', {}, { username: false })).toEqual({
        passed: false,
        notFound: true,
      });
      expect(await run('/api/auth/sign-in/username')).toEqual({ passed: true, notFound: false });
    });

    it.each([
      ['emailPassword', '/api/auth/sign-in/email'],
      ['emailPassword', '/api/auth/sign-up/email'],
      ['emailPassword', '/api/auth/request-password-reset'],
      ['emailPassword', '/api/auth/reset-password/some-token'],
      ['username', '/api/auth/is-username-available'],
      ['twoFactor', '/api/auth/two-factor/enable'],
      ['twoFactor', '/api/auth/two-factor/get-totp-uri'],
      ['twoFactor', '/api/auth/two-factor/generate-backup-codes'],
      ['twoFactor', '/api/auth/Two-Factor/%65nable'],
      ['magicLink', '/api/auth/sign-in/magic-link'],
      ['magicLink', '/api/auth/magic-link/verify?token=x'],
      ['emailOtp', '/api/auth/sign-in/email-otp'],
      ['emailOtp', '/api/auth/email-otp/send-verification-otp'],
      ['emailOtp', '/api/auth/forget-password/email-otp'],
      ['emailOtp', '/api/auth/Forget-Password/%65mail-otp'],
      ['passkey', '/api/auth/sign-in/passkey'],
      ['passkey', '/api/auth/passkey/generate-register-options'],
    ])('%s: %s', async (method, target) => {
      expect(await run(target, {}, { [method]: false })).toEqual({ passed: false, notFound: true });
      expect(await run(target)).toEqual({ passed: true, notFound: false });
    });

    it('gives the email OTP reset code to the email OTP method alone, not to the password reset', async () => {
      const target = '/api/auth/forget-password/email-otp';

      // Passwords off, the email OTP method on: its own reset code is still answered
      expect(await run(target, {}, { emailPassword: false })).toEqual({
        passed: true,
        notFound: false,
      });
      // The password reset itself is the password method's
      expect(await run('/api/auth/forget-password', {}, { emailPassword: false })).toEqual({
        passed: false,
        notFound: true,
      });
      expect(await run('/api/auth/forget-password', {}, { emailOtp: false })).toEqual({
        passed: true,
        notFound: false,
      });
    });

    it.each([
      '/api/auth/two-factor/verify-totp',
      '/api/auth/two-factor/verify-otp',
      '/api/auth/two-factor/verify-backup-code',
      '/api/auth/two-factor/send-otp',
      '/api/auth/two-factor/disable',
    ])('two-factor off leaves %s, so a user who has it can still sign in', async (target) => {
      expect(await run(target, {}, { twoFactor: false })).toEqual({
        passed: true,
        notFound: false,
      });
    });

    it('however the path is spelled', async () => {
      for (const target of [
        '/api/auth/Sign-In/Username',
        '/api/auth/sign-in/username/',
        '/api/auth/sign-in/%75sername',
        '/api/auth//sign-in/username',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await run(target, {}, { username: false }), target).toMatchObject({ passed: false });
      }
    });

    it('leaves every other endpoint alone', async () => {
      const off = {
        emailPassword: false,
        username: false,
        twoFactor: false,
        magicLink: false,
        emailOtp: false,
        passkey: false,
      };

      for (const target of ['/api/auth/get-session', '/api/auth/sign-out', '/api/auth/ok']) {
        // eslint-disable-next-line no-await-in-loop
        expect(await run(target, {}, off), target).toMatchObject({ passed: true });
      }

      expect(await run('/api/auth/sign-in/email', {}, { username: false })).toMatchObject({
        passed: true,
      });
    });

    it('reads no setting for an endpoint that belongs to no method', async () => {
      const get = vi.fn();
      const strapi = {
        config: { get: () => undefined },
        plugin: () => ({ service: () => ({ get }) }),
      } as unknown as Core.Strapi;
      const middleware = endpointAllowlist({}, { strapi }) as Core.MiddlewareHandler;
      const next = vi.fn().mockResolvedValue(undefined);

      await middleware(koaCtx({ url: '/api/auth/get-session' }), next);

      expect(get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
