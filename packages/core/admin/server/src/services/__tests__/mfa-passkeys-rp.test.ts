/* eslint-env jest */

import type { Core } from '@strapi/types';
import { resolveWebauthnRp, createPasskeys, PASSKEY_RP_NOT_CONFIGURED } from '../mfa-passkeys';
import { resetSecuritySettingsWarnings } from '../security-settings';

/** These tests are the whole specification of what a deployment must configure. None of it is
 * ever taken from the request's Origin header: the fixed relying-party identity is what WebAuthn's
 * phishing resistance rests on. */
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

  test('a configured rpId is case-normalised, so a same-case-mismatched origin still matches', () => {
    // Compared against `URL.hostname`, which is always lowercased. Without normalising the config
    // value, `EXAMPLE.com` is refused with `.origins` blamed for a `.rpId` casing problem.
    const { strapi, error } = buildStrapi({
      'admin.auth.mfa.webauthn.rpId': 'EXAMPLE.com',
      'admin.auth.mfa.webauthn.origins': ['https://example.com'],
    });

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'example.com',
      origins: ['https://example.com'],
    });
    expect(error).not.toHaveBeenCalled();
  });

  test('a trailing dot on a configured rpId is stripped, and the dotless suffix it would reveal is still refused', () => {
    // `com.` is the `com` public suffix plus the DNS root dot. The dotless check exists
    // precisely to catch `com`; a trailing dot must not be a way around it.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.rpId': 'com.',
      'admin.auth.mfa.webauthn.origins': ['https://attacker.com.'],
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('public suffix (or a bare label)'));
  });

  test('a trailing dot on a derived rpId no longer produces a browser-invalid rpId', () => {
    // Unnormalised this yields `rpId: 'example.com.'`, which no browser accepts, returned with no
    // refusal and no log. Normalised, the derived origin still carries the root dot and no longer
    // matches, so it fails closed here instead.
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'https://example.com./admin' });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('example.com'));
  });

  test('a leading dot is not a valid host and is refused explicitly', () => {
    // A leading dot defeats the dotless check the same way a trailing one does
    // (`.com`.includes('.') is true), so it needs its own explicit refusal.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.rpId': '.example.com',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('starts with "."'));
  });

  test('two or more trailing dots on a configured rpId are all stripped, not just one', () => {
    // A single-dot strip leaves `a.b..` as `a.b.`, still invalid -- and the unnormalised derived
    // origin then matches it exactly, so the call is accepted with a browser-invalid rpId and no log.
    // Stripping the whole run removes the accidental match and it refuses on the relation check.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://a.b./x',
      'admin.auth.mfa.webauthn.rpId': 'a.b..',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('is neither the relying party "a.b" nor a subdomain of it')
    );
  });

  test('a leading double dot is refused the same way a single leading dot is', () => {
    // Only trailing dots are stripped, so a leading run must hit the same refusal a single one does.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.rpId': '..a.b',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('starts with "."'));
  });

  test.each([['.'], ['..']])(
    'a configured rpId of only dots (%s) normalises to nothing and is refused, not accepted',
    (dotsOnly) => {
      // Nothing is left after the strip, so this must reach the same "cannot be derived" refusal as an
      // empty rpId rather than survive as a truthy string.
      const { strapi, error } = buildStrapi({
        'admin.absoluteUrl': 'https://cms.example.com/admin',
        'admin.auth.mfa.webauthn.rpId': dotsOnly,
      });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.rpId'));
    }
  );

  test('a non-array origins config is refused rather than silently discarded', () => {
    // A bare string falls through `Array.isArray` unnoticed, leaving the derived origin in place with
    // no refusal and no log -- the one misconfiguration here that could produce neither.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': 'https://evil.com',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.origins'));
  });

  test('an unparseable admin.absoluteUrl together with a configured rpId reaches "no expected origin could be derived"', () => {
    // Reachable because a configured rpId skips the derivability refusal, so an unparseable
    // `admin.absoluteUrl` reaches origin derivation with nothing to fall back on.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'not a url',
      'admin.auth.mfa.webauthn.rpId': 'example.com',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('no expected origin could be derived from admin.absoluteUrl')
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.origins'));
  });

  test('an origin candidate that cannot be parsed as a URL is refused', () => {
    // Deleting this try/catch would let a raw TypeError escape resolveWebauthnRp,
    // turning a 400 into a 500 on an unauthenticated route, with the suite staying green.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': [{}],
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('is not a URL'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.origins'));
  });

  test.each([['https://127.0.0.1/admin'], ['https://[::1]/admin'], ['https://[::]/admin']])(
    'an IP literal (%s) behind a secure origin is refused specifically as an IP literal',
    (adminUrl) => {
      // The `http://` rows above are each refused by a different guard, so none tests isIP alone.
      // These use `https:` and assert the IP-literal message, which catches isIP being disabled.
      const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': adminUrl });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('is an IP literal'));
    }
  );

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
    // The default production shape: an unset `server.url` plus the template's `HOST=0.0.0.0`.
    // 127.0.0.1 is a secure context but still not a valid RP ID.
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
    // The dangerous case: nothing else relates the two, so the check runs whenever
    // either key is set (it is trivially satisfied when both are derived).
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': ['https://cms.other.example'],
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    // Every refusal throws the same message, so pin the branch by the log text only it produces.
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        'is neither the relying party "cms.example.com" nor a subdomain of it'
      )
    );
  });

  test.each([['com'], ['co.uk'], ['localhostx']])(
    'a public suffix or bare label (%s) is refused',
    (rpId) => {
      const { strapi, error } = buildStrapi({
        'admin.absoluteUrl': 'https://cms.example.com/admin',
        'admin.auth.mfa.webauthn.rpId': rpId,
      });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      // Pin the public-suffix/bare-label branch specifically, not just "something refused".
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('public suffix (or a bare label)')
      );
    }
  );

  test.each([['co.kr'], ['com.tr'], ['co.il'], ['net.au'], ['org.au'], ['gov.au']])(
    'a common second-level suffix under a ccTLD (%s) is refused even though it has no named entry',
    (rpId) => {
      // Missing from the set, each of these is accepted here and then fails in every browser with an
      // opaque `SecurityError` and no server-side trace of why.
      const { strapi, error } = buildStrapi({
        'admin.absoluteUrl': 'https://cms.example.com/admin',
        'admin.auth.mfa.webauthn.rpId': rpId,
      });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('public suffix (or a bare label)')
      );
    }
  );

  test.each([['co.io'], ['org.io'], ['com.io'], ['net.de']])(
    'a real registrable two-label domain (%s) is accepted, not refused as a suffix',
    (rpId) => {
      // Refusing on shape rather than membership catches these, none of which is a public suffix,
      // locking those deployments out with no override. The approximation may only ever MISS one.
      const { strapi } = buildStrapi({
        'admin.absoluteUrl': `https://${rpId}/admin`,
      });

      expect(resolveWebauthnRp(strapi)).toEqual({
        rpId,
        origins: [`https://${rpId}`],
      });
    }
  );

  test('a genuine two-label domain that does not match the generic ccTLD shape is still accepted', () => {
    // Guards the check against growing broad enough to refuse real registrable domains.
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'https://example.com/admin' });

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'example.com',
      origins: ['https://example.com'],
    });
    expect(error).not.toHaveBeenCalled();
  });

  test('the refusal logs under [admin.auth.mfa], not [security-settings], and the trailing sentence is level-aware', () => {
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);

    expect(error).toHaveBeenCalledTimes(1);
    const [message] = error.mock.calls[0];
    expect(message).toContain('[admin.auth.mfa]');
    expect(message).not.toContain('[security-settings]');
    // Logged at error level, so the trailing sentence must call itself a message, not a warning.
    expect(message).toContain('this message is logged once per process');
    expect(message).not.toContain('this warning is logged once per process');
  });

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

/** The boot-time half of the same misconfiguration: without it the cause surfaces only once
 * somebody loads the admin, in request logs, long after the operator stopped watching. */
describe('warnIfPasskeysMisconfigured', () => {
  const buildService = (config: Record<string, unknown>, enabled: boolean) => {
    const { strapi, error, warn } = buildStrapi(config);
    const passkeys = createPasskeys({
      strapi,
      settings: async () => ({ enabled }),
      config: () => ({}) as never,
      recordEvent: jest.fn(),
      notify: jest.fn(),
      isAccountThrottled: jest.fn(),
    } as never);

    return { passkeys, error, warn };
  };

  beforeEach(() => {
    resetSecuritySettingsWarnings();
  });

  test('logs the cause and the config key that fixes it when the relying party cannot resolve', async () => {
    // The shape a production deployment that never set `server.url` actually lands in.
    const { passkeys, error } = buildService(
      { 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' },
      true
    );

    await passkeys.warnIfPasskeysMisconfigured();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.rpId'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining('IP literal'));
  });

  test('resolves without throwing, so a misconfiguration can never stop the admin booting', async () => {
    const { passkeys } = buildService({ 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' }, true);

    await expect(passkeys.warnIfPasskeysMisconfigured()).resolves.toBeUndefined();
  });

  test('says nothing when the relying party resolves', async () => {
    const { passkeys, error, warn } = buildService(DERIVED, true);

    await passkeys.warnIfPasskeysMisconfigured();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  test('says nothing when the organisation has passkeys switched off', async () => {
    // No feature to be missing, so an error about an unused config key would be pure noise -- and
    // the config here is the broken one, so this pins the policy check rather than a lucky pass.
    const { passkeys, error, warn } = buildService(
      { 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' },
      false
    );

    await passkeys.warnIfPasskeysMisconfigured();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  test('spends the once-per-process budget at boot, so the lazy callers stay quiet afterwards', async () => {
    // Deliberate: the operator has already been told, and `warnOnce` keys this to `webauthn.rp`.
    const { passkeys, error } = buildService(
      { 'admin.absoluteUrl': 'http://0.0.0.0:1337/admin' },
      true
    );

    await passkeys.warnIfPasskeysMisconfigured();
    expect(passkeys.passkeysConfigured()).toBe(false);
    expect(passkeys.passkeysConfigured()).toBe(false);

    expect(error).toHaveBeenCalledTimes(1);
  });
});
