/* eslint-env jest */

import type { Core } from '@strapi/types';
import { resolveWebauthnRp, PASSKEY_RP_NOT_CONFIGURED } from '../mfa-passkeys';
import { resetSecuritySettingsWarnings } from '../security-settings';

/**
 * `resolveWebauthnRp` is read on every ceremony (no caching -- config is static, and a cache is
 * one more thing to invalidate), so these tests are the whole specification of what a deployment
 * must configure. The fixed relying-party identity is the check WebAuthn's phishing resistance
 * rests on, which is why none of this is ever taken from the request's Origin header.
 */
const buildStrapi = (config: Record<string, unknown>) => {
  const error = jest.fn();
  const warn = jest.fn();
  const strapi = {
    config: { get: jest.fn((key: string) => config[key]) },
    log: { error, warn },
  } as unknown as Core.Strapi;

  return { strapi, error, warn };
};

const DERIVED = { 'admin.absoluteUrl': 'https://cms.example.com/admin' };

describe('resolveWebauthnRp', () => {
  beforeEach(() => {
    resetSecuritySettingsWarnings();
  });

  test('derives the rpId and the expected origin from admin.absoluteUrl', () => {
    const { strapi, error } = buildStrapi(DERIVED);

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'cms.example.com',
      origins: ['https://cms.example.com'],
    });
    expect(error).not.toHaveBeenCalled();
  });

  test('localhost in development is a working derived setup', () => {
    // The one reason `examples/getstarted` needs no configuration: `getAbsoluteAdminUrl` only
    // rewrites the host to localhost when `environment === 'development'`.
    const { strapi } = buildStrapi({ 'admin.absoluteUrl': 'http://localhost:1337/admin' });

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'localhost',
      origins: ['http://localhost:1337'],
    });
  });

  test('the two config keys override the derivation', () => {
    const { strapi } = buildStrapi({
      ...DERIVED,
      'admin.auth.mfa.webauthn.rpId': 'example.com',
      'admin.auth.mfa.webauthn.origins': ['https://cms.example.com', 'https://admin.example.com'],
    });

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'example.com',
      origins: ['https://cms.example.com', 'https://admin.example.com'],
    });
  });

  test('a subdomain is accepted at a label boundary, and evil-example.com is not', () => {
    const ok = buildStrapi({
      'admin.absoluteUrl': 'https://example.com/admin',
      'admin.auth.mfa.webauthn.origins': ['https://deep.cms.example.com'],
    });
    expect(resolveWebauthnRp(ok.strapi).origins).toEqual(['https://deep.cms.example.com']);

    // `host.endsWith(rpId)` would accept this; `host.endsWith('.' + rpId)` is why it does not.
    const evil = buildStrapi({
      'admin.absoluteUrl': 'https://example.com/admin',
      'admin.auth.mfa.webauthn.origins': ['https://evil-example.com'],
    });
    expect(() => resolveWebauthnRp(evil.strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(evil.error).toHaveBeenCalledWith(expect.stringContaining('evil-example.com'));
  });

  test.each([
    ['http://0.0.0.0:1337/admin'],
    ['http://127.0.0.1:1337/admin'],
    ['http://[::1]:1337/admin'],
    ['http://[::]:1337/admin'],
  ])('an IP literal (%s) is refused, naming the config key', (adminUrl) => {
    // This is the default production shape: `server.url` of '' plus the HOST=0.0.0.0 every
    // create-strapi-app template writes gives `http://0.0.0.0:1337/admin`. 127.0.0.1 is a secure
    // context but still not a valid RP ID, so "warn and proceed" would produce a broken ceremony.
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': adminUrl });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.rpId'));
  });

  test('a plain-http origin that is not localhost is refused', () => {
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'http://cms.example.com/admin' });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('secure'));
  });

  test('origins configured against a *derived* rpId are still checked against it', () => {
    // The dangerous case the spec names: nothing else relates the two, so the check runs whenever
    // either key is set (it is trivially satisfied when both are derived).
    const { strapi } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': ['https://cms.other.example'],
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
  });

  test.each([['com'], ['co.uk'], ['localhostx']])(
    'a public suffix or bare label (%s) is refused',
    (rpId) => {
      const { strapi } = buildStrapi({
        'admin.absoluteUrl': 'https://cms.example.com/admin',
        'admin.auth.mfa.webauthn.rpId': rpId,
      });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    }
  );

  test.each([[undefined], [''], ['not a url'], ['/admin']])(
    'an unparseable admin.absoluteUrl (%p) surfaces the config key',
    (adminUrl) => {
      const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': adminUrl });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.rpId'));
    }
  );

  test('the cause is logged once per process, not once per ceremony', () => {
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' });

    for (let i = 0; i < 3; i += 1) {
      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    }

    expect(error).toHaveBeenCalledTimes(1);
  });

  test('the refusal never leaks the cause into the error a caller sees', () => {
    const { strapi } = buildStrapi({ 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' });

    try {
      resolveWebauthnRp(strapi);
      throw new Error('expected a refusal');
    } catch (thrown) {
      expect((thrown as Error).message).toBe(PASSKEY_RP_NOT_CONFIGURED);
      expect((thrown as Error).message).not.toContain('0.0.0.0');
    }
  });
});
