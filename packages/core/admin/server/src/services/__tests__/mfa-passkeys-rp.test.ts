/* eslint-env jest */

import type { Core } from '@strapi/types';
import { resolveWebauthnRp, createPasskeys, PASSKEY_RP_NOT_CONFIGURED } from '../mfa-passkeys';
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

  test('a configured rpId is case-normalised, so a same-case-mismatched origin still matches', () => {
    // Finding 4: `EXAMPLE.com` used to be compared, unlowercased, against `URL.hostname` (which
    // the URL parser always lowercases), so a config that is correct in every way a browser cares
    // about was refused, blaming `.origins` for a `.rpId` casing problem.
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
    // Finding 1: `com.` is the `com` public suffix plus the DNS root dot. The dotless check exists
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
    // Finding 1: `admin.absoluteUrl: 'https://example.com./admin'` used to silently derive
    // `rpId: 'example.com.'`, which is not a hostname any browser accepts, with no refusal and no
    // log. Normalising means the module never returns that broken value; here it is refused
    // instead, because the (unmodified) derived origin still literally carries the root dot and no
    // longer matches the now-corrected rpId -- a fail-closed outcome, not a silent broken accept.
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'https://example.com./admin' });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('example.com'));
  });

  test('a leading dot is not a valid host and is refused explicitly', () => {
    // Finding 1: a leading dot defeats the dotless check the same way a trailing one does
    // (`.com`.includes('.') is true), so it needs its own explicit refusal.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.rpId': '.example.com',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('starts with "."'));
  });

  test('two or more trailing dots on a configured rpId are all stripped, not just one', () => {
    // Task 4 fix round 2: `normalizeHost`'s single-dot strip (`replace(/\.$/, '')`) turned
    // `a.b..` into `a.b.` -- still not a valid host -- and because the *unnormalised* derived
    // origin (`https://a.b.`, one dot) then string-matched that leftover-dot rpId exactly, the
    // call was ACCEPTED with a browser-invalid `rpId: 'a.b.'` and no refusal, no log. Stripping the
    // whole trailing run (`a.b..` -> `a.b`) removes the accidental match: the origin host (`a.b.`)
    // no longer equals the correctly-normalised rpId (`a.b`), so this now refuses on the
    // relation check instead of returning a broken value.
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
    // `normalizeHost` only ever strips trailing dots, so a leading run of any length must still
    // hit the same explicit leading-dot refusal as a single leading dot -- confirming that refusal
    // has no single-vs-repeated gap of its own.
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
      // A host of only dots has no label left after the trailing-dot strip removes every dot in
      // it, so it must fall into the same "cannot be derived" refusal as an empty rpId -- never
      // survive as a truthy string that passes the later checks.
      const { strapi, error } = buildStrapi({
        'admin.absoluteUrl': 'https://cms.example.com/admin',
        'admin.auth.mfa.webauthn.rpId': dotsOnly,
      });

      expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.rpId'));
    }
  );

  test('a non-array origins config is refused rather than silently discarded', () => {
    // Finding 5: a bare string typo for `origins` used to fall through `Array.isArray` unnoticed
    // and fall back to the derived origin, with no refusal and no log -- the one misconfiguration
    // in this module that produced neither. Refusing (rather than accepting a one-element array)
    // matches the module's fail-closed-and-loud contract: this is a misconfiguration to name, not
    // shorthand to accept.
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': 'https://evil.com',
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('admin.auth.mfa.webauthn.origins'));
  });

  test('an unparseable admin.absoluteUrl together with a configured rpId reaches "no expected origin could be derived"', () => {
    // Finding 3: the previous report claimed this branch was unreachable. It is not: a configured
    // rpId skips the derivability refusal entirely, so an unparseable admin.absoluteUrl reaches
    // origin derivation with `derived === null` and no configured `origins` to fall back on.
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
    // Finding 7: deleting this try/catch would let a raw TypeError escape resolveWebauthnRp,
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
      // Finding 2: all four rows of the existing IP-literal table are `http://`, each refused by a
      // *different* guard (non-secure-origin for the dotted-quad ones, bare-label for the bracketed
      // IPv6 ones) -- none of them fails only because of the isIP guard. These use `https:` so the
      // non-secure-origin refusal cannot fire, and assert the IP-literal message specifically so a
      // bare-label or non-secure refusal firing instead (i.e. isIP silently disabled) is caught.
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
    const { strapi, error } = buildStrapi({
      'admin.absoluteUrl': 'https://cms.example.com/admin',
      'admin.auth.mfa.webauthn.origins': ['https://cms.other.example'],
    });

    expect(() => resolveWebauthnRp(strapi)).toThrow(PASSKEY_RP_NOT_CONFIGURED);
    // Finding 6: every refusal throws the same shared message, so a bare `.toThrow` assertion
    // cannot tell this branch (the rpId/origin relation check) from any other. Pin the branch by
    // asserting text only it produces.
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
      // Finding 6: pin the public-suffix/bare-label branch specifically, not just "something
      // refused".
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('public suffix (or a bare label)')
      );
    }
  );

  test.each([['co.kr'], ['com.tr'], ['co.il'], ['net.au'], ['org.au'], ['gov.au']])(
    'M4: a common second-level suffix under a ccTLD (%s) is refused even though it has no named entry',
    (rpId) => {
      // These were missing from `KNOWN_PUBLIC_SUFFIXES`'s original twelve entries, which is the
      // gap M4 reports: each was accepted here and then failed in every browser with an opaque
      // `SecurityError` and no server-side trace of why. They are named entries now.
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
    'M4: a real registrable two-label domain (%s) is accepted, not refused as a suffix',
    (rpId) => {
      // The regression this pins. An earlier revision refused on SHAPE -- any two-label host whose
      // first label was generic and whose second was two characters -- which caught all four of
      // these even though none is a public suffix, locking those deployments out of passkeys with
      // no override. The approximation must only ever MISS a suffix (the browser then refuses, as
      // it did before the check existed), never invent one.
      const { strapi } = buildStrapi({
        'admin.absoluteUrl': `https://${rpId}/admin`,
      });

      expect(resolveWebauthnRp(strapi)).toEqual({
        rpId,
        origins: [`https://${rpId}`],
      });
    }
  );

  test('M4: a genuine two-label domain that does not match the generic ccTLD shape is still accepted', () => {
    // Guards the widened check against being so broad it starts refusing real registrable
    // domains: `example.com`'s first label is seven characters, nowhere near the generic
    // second-level label set, so it must not be caught by the new shape rule.
    const { strapi, error } = buildStrapi({ 'admin.absoluteUrl': 'https://example.com/admin' });

    expect(resolveWebauthnRp(strapi)).toEqual({
      rpId: 'example.com',
      origins: ['https://example.com'],
    });
    expect(error).not.toHaveBeenCalled();
  });

  test('M2: the refusal logs under [admin.auth.mfa], not [security-settings], and the trailing sentence is level-aware', () => {
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

/**
 * The boot-time half of the same misconfiguration. `resolveWebauthnRp` already logs the cause, but
 * before this the first thing to ask it was `/mfa/me`, so the line surfaced only once somebody
 * loaded the admin -- in request logs, well after an operator had stopped reading the console.
 */
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
