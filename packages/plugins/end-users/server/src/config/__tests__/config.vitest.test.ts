import { afterEach, describe, expect, it, vi } from 'vitest';

import { defineAuth } from '../../engine/better-auth/define-auth';
import config from '../index';
import { validateConfig } from '../validate-config';

const production = { NODE_ENV: 'production' };
const SECRET = 'a-secret-that-is-at-least-32-characters-long';

describe('validateConfig', () => {
  it('refuses to start in production without a secret', () => {
    expect(() => validateConfig({ secret: undefined }, production)).toThrow(/END_USERS_SECRET/);
    expect(() => validateConfig({ secret: '' }, production)).toThrow(/END_USERS_SECRET/);
    expect(() => validateConfig({}, production)).toThrow(/END_USERS_SECRET/);
  });

  it('still refuses to start in production without a secret, development generates one', () => {
    expect(() => validateConfig({}, production)).toThrow(/END_USERS_SECRET/);
    // development has no secret at validation: the plugin generates one when it registers
    expect(() => validateConfig({}, { NODE_ENV: 'development' })).not.toThrow();
  });

  it('starts in production with a secret', () => {
    expect(() => validateConfig({ secret: SECRET }, production)).not.toThrow();
  });

  it('starts without a secret outside production', () => {
    expect(() => validateConfig({}, { NODE_ENV: 'development' })).not.toThrow();
    expect(() => validateConfig({}, { NODE_ENV: 'test' })).not.toThrow();
    expect(() => validateConfig({}, {})).not.toThrow();
  });

  it('refuses a secret that is not a string', () => {
    expect(() => validateConfig({ secret: 42 }, {})).toThrow(/secret/);
  });

  it('reads the environment of the process when it is not given one', () => {
    // vitest runs with NODE_ENV=test
    expect(() => validateConfig({})).not.toThrow();
  });

  it('accepts what the defaults are made of', () => {
    const defaults = (config.default as (args: { env: unknown }) => Record<string, unknown>)({
      env: Object.assign(() => undefined, { bool: () => false }),
    });

    expect(() => validateConfig(defaults, {})).not.toThrow();
  });

  it('keeps the keys it does not know, so a project can add its own', () => {
    expect(() =>
      validateConfig({ secret: SECRET, extra: 'value', hook: () => 'called' }, production)
    ).not.toThrow();
  });

  describe('trustedOrigins', () => {
    it('is a list of origins', () => {
      expect(() =>
        validateConfig({ trustedOrigins: ['https://app.example.com'] }, {})
      ).not.toThrow();
      expect(() => validateConfig({ trustedOrigins: [] }, {})).not.toThrow();
    });

    it('is refused when it is not a list of strings', () => {
      expect(() => validateConfig({ trustedOrigins: 'https://app.example.com' }, {})).toThrow(
        /trustedOrigins/
      );
      expect(() => validateConfig({ trustedOrigins: [42] }, {})).toThrow(/trustedOrigins/);
      expect(() => validateConfig({ trustedOrigins: [''] }, {})).toThrow(/trustedOrigins/);
    });

    // Better Auth matches every origin against these as patterns, `*` and `?` included: an entry that
    // is nothing but wildcards makes it trust every origin, which switches off its CSRF check
    describe('refuses an entry that trusts every origin', () => {
      it.each([
        ['a lone *', '*'],
        ['a lone *, padded', '  *  '],
        ['a run of wildcards', '**'],
        ['a mix of wildcards', '*?'],
        ['a wildcard in place of the host, any scheme', '*://*'],
        ['a wildcard in place of the host, https', 'https://*'],
        ['a wildcard in place of the host, http', 'http://*'],
        ['a wildcard host with a port', 'https://*:3000'],
        ['wildcards and dots only', 'https://*.*'],
        ['wildcards and dots only, without a scheme', '*.*'],
        ['a wildcard host and a wildcard port', 'https://*:*'],
        // Better Auth matches the origin, which has no path, so what follows the host changes nothing
        ['a wildcard host and a path wildcard', 'https://*/*'],
        ['a wildcard host and a path of wildcards', 'https://*/**'],
        ['a wildcard host and a path of wildcards, http', 'http://*/**'],
        ['a wildcard host and a path of wildcards, no scheme', '*/**'],
        ['a wildcard host, a port and a path of wildcards', 'https://*:3000/**'],
        ['a wildcard host and a slash', 'https://*/'],
        // an empty segment is skipped
        ['a path of wildcards and nothing before it', '/**'],
        ['an empty authority before a path of wildcards', 'https:///**'],
        // a scheme that is a pattern, which matches http and https
        ['a wildcard scheme', 'ht*://*'],
        ['a wildcard scheme that ends in a wildcard', 'https*://*'],
        ['a wildcard host that names no label at all', 'https://*.*.*'],
      ])('%s', (_name, origin) => {
        expect(() =>
          validateConfig({ trustedOrigins: ['https://app.example.com', origin] }, {})
        ).toThrow(/trustedOrigins/);
      });

      it('says what is wrong and what to write instead', () => {
        expect(() => validateConfig({ trustedOrigins: ['*'] }, {})).toThrow(
          /every origin.*CSRF.*https:\/\/app\.example\.com/s
        );
      });

      it('names the entry it refuses', () => {
        expect(() => validateConfig({ trustedOrigins: ['https://*'] }, {})).toThrow(
          /"https:\/\/\*"/
        );
      });

      it('refuses it in production too, with the secret set', () => {
        expect(() => validateConfig({ secret: SECRET, trustedOrigins: ['*'] }, production)).toThrow(
          /trustedOrigins/
        );
      });
    });

    // `/**` right after the host, or a host that ends in `*`, makes Better Auth match every host
    // that starts with the same text: `https://app.example.com/**` trusts
    // `https://app.example.com.evil.net`, a name that anyone can register
    describe('refuses an entry that matches a host by its start', () => {
      it.each([
        ['a path of wildcards', 'https://app.example.com/**'],
        ['a path of wildcards, http', 'http://app.example.com/**'],
        ['a path of wildcards, no scheme', 'app.example.com/**'],
        ['a path of wildcards after a wildcard subdomain', 'https://*.example.com/**'],
        ['a path of wildcards, twice', 'https://app.example.com/**/**'],
        ['a host that ends in a wildcard', 'https://app.example.com*'],
        ['a host that ends in two', 'https://app.example.com**'],
        ['a host that ends in a wildcard and a ?', 'https://app.example.com*?'],
        ['a host that is a start', 'https://app*'],
        ['a wildcard top level domain', 'https://app.example.*'],
        ['a wildcard address', 'http://192.168.1.*'],
        ['a host that ends in a wildcard, before a port', 'https://app.example.com*:3000'],
      ])('%s', (_name, origin) => {
        expect(() =>
          validateConfig({ trustedOrigins: ['https://app.example.com', origin] }, {})
        ).toThrow(/trustedOrigins.*start of a host/s);
      });

      it('names the entry, and says what to write instead', () => {
        expect(() =>
          validateConfig({ trustedOrigins: ['https://app.example.com/**'] }, {})
        ).toThrow(
          /"https:\/\/app\.example\.com\/\*\*".*app\.example\.com\.evil\.net.*\*\.example\.com/s
        );
      });

      it('refuses it in production too, with the secret set', () => {
        expect(() =>
          validateConfig(
            { secret: SECRET, trustedOrigins: ['https://app.example.com/**'] },
            production
          )
        ).toThrow(/trustedOrigins/);
      });

      it('does not touch a custom scheme, which no web page has', () => {
        expect(() =>
          validateConfig({ trustedOrigins: ['exp://*/**', 'myapp://*', 'exp://192.168.*.*:*'] }, {})
        ).not.toThrow();
      });
    });

    // No real origin has a backslash, and Better Auth reads one as an escape, which can hide the
    // wildcard that ends a host: `https://app\.example.com*` trusts `https://app.example.com.evil.net`
    describe('refuses a backslash in an entry a web page can match', () => {
      it.each([
        ['an escaped dot before a trailing wildcard', 'https://app\\.example.com*'],
        ['the same before a port', 'https://app\\.example.com*:3000'],
        ['an escaped dot before a wildcard top level domain', 'https://app\\.example.*'],
        ['the same with a ?', 'https://app\\.example.com*?'],
        ['an escape in the first label', 'https://a\\pp.example.com*'],
        ['an escaped dot without a scheme', 'app\\.example.com*'],
        ['an escaped dot in an address', 'http://192\\.168\\.1\\.*'],
        ['an escaped dot in an entry with no wildcard', 'https://app\\.example.com'],
        ['an escaped dot after a wildcard subdomain', 'https://*\\.example.com'],
        ['a path after an escape', 'https://app.example.com\\/**'],
        ['a trailing backslash', '*\\'],
        ['a trailing backslash, https', 'https://*\\'],
        ['an escape in the scheme', 'ht\\tp://*'],
      ])('%s', (_name, origin) => {
        expect(() =>
          validateConfig({ trustedOrigins: ['https://app.example.com', origin] }, {})
        ).toThrow(/trustedOrigins.*can't contain a backslash/s);
      });

      it('names the entry, and says what to write instead', () => {
        expect(() =>
          validateConfig({ trustedOrigins: ['https://app\\.example.com*'] }, {})
        ).toThrow(
          /"https:\/\/app\\\\\.example\.com\*".*no real origin.*"https:\/\/app\.example\.com"/s
        );
      });

      it('refuses it in production too, with the secret set', () => {
        expect(() =>
          validateConfig({ secret: SECRET, trustedOrigins: ['app\\.example.com*'] }, production)
        ).toThrow(/backslash/);
      });

      it('does not touch an entry with a custom scheme', () => {
        expect(() =>
          validateConfig(
            { trustedOrigins: ['exp://app\\.example', 'exp://*\\.example', 'myapp://x\\y*'] },
            {}
          )
        ).not.toThrow();
      });
    });

    // A custom scheme is not one that a web page comes from, so a pattern with one trusts no web
    // origin; native apps (Expo, a mobile deep link) need them. They get a boot warning instead
    it('accepts a pattern with a custom scheme, wildcard host or not', () => {
      for (const origin of [
        'exp://**',
        'exp://*',
        'exp://*/**',
        'exp://192.168.*.*:8081',
        'myapp://*',
        'myapp://',
        'myapp://callback',
      ]) {
        expect(() => validateConfig({ trustedOrigins: [origin] }, {}), origin).not.toThrow();
      }
    });

    // `?` stands for one character: these match hosts of a few characters, not every host
    it('accepts a host that is a few characters wide, and a path that matches nothing', () => {
      for (const origin of [
        '?',
        '??',
        '?.?',
        'https://?',
        'https://app.example.com/*',
        'https://app.example.com/*/**',
        'https://app.example.com:*',
        'https://app.example.com:3000/**',
      ]) {
        expect(() => validateConfig({ trustedOrigins: [origin] }, {}), origin).not.toThrow();
      }
    });

    it('accepts a narrower wildcard pattern', () => {
      for (const origin of [
        'https://*.example.com',
        '*.example.com',
        'https://app-*.example.com',
        'https://app-?.example.com',
        'https://*.example.com:8443',
      ]) {
        expect(() => validateConfig({ trustedOrigins: [origin] }, {}), origin).not.toThrow();
      }
    });
  });

  // Better Auth also reads BETTER_AUTH_TRUSTED_ORIGINS, a comma separated list, every time it
  // answers (better-auth/dist/context/helpers.mjs, `getTrustedOrigins`), and adds it to the list.
  describe('BETTER_AUTH_TRUSTED_ORIGINS', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.each([
      ['a lone *', '*'],
      ['a lone *, padded', ' * '],
      ['a * in a list', 'https://app.example.com,*'],
      ['a * in a list, with spaces', 'https://app.example.com, *'],
      ['a wildcard host', 'https://app.example.com,https://*'],
      ['a wildcard host with a port', 'https://*:3000'],
      ['wildcards and dots only', '*.*'],
      ['a path of wildcards', 'https://app.example.com,https://*/**'],
      ['a wildcard scheme', 'ht*://*'],
    ])('is refused with %s, and named', (_name, value) => {
      expect(() => validateConfig({}, { BETTER_AUTH_TRUSTED_ORIGINS: value })).toThrow(
        /BETTER_AUTH_TRUSTED_ORIGINS.*every origin.*CSRF/s
      );
    });

    it.each([
      ['an escaped dot before a trailing wildcard', 'https://app\\.example.com*'],
      ['a trailing backslash', '*\\'],
      [
        'an escaped dot in a list, with spaces',
        'https://admin.example.com, http://192\\.168\\.1\\.*',
      ],
      ['an escape in the scheme', 'ht\\tp://*'],
    ])('is refused with %s, as a backslash, and named', (_name, value) => {
      expect(() => validateConfig({}, { BETTER_AUTH_TRUSTED_ORIGINS: value })).toThrow(
        /BETTER_AUTH_TRUSTED_ORIGINS.*can't contain a backslash/s
      );
    });

    it.each([
      ['a path of wildcards', 'https://app.example.com/**'],
      ['a path of wildcards in a list', 'https://admin.example.com,https://*.example.com/**'],
      ['a host that ends in a wildcard', 'https://app.example.*'],
      ['a wildcard address, with spaces', 'https://app.example.com, http://192.168.1.*'],
    ])('is refused with %s, as the start of a host, and named', (_name, value) => {
      expect(() => validateConfig({}, { BETTER_AUTH_TRUSTED_ORIGINS: value })).toThrow(
        /BETTER_AUTH_TRUSTED_ORIGINS.*start of a host/s
      );
    });

    it('is refused in production with the secret set, and when trustedOrigins is fine', () => {
      expect(() =>
        validateConfig(
          { secret: SECRET, trustedOrigins: ['https://app.example.com'] },
          { ...production, BETTER_AUTH_TRUSTED_ORIGINS: '*' }
        )
      ).toThrow(/BETTER_AUTH_TRUSTED_ORIGINS/);
    });

    it('names the entry it refuses', () => {
      expect(() =>
        validateConfig({}, { BETTER_AUTH_TRUSTED_ORIGINS: 'https://app.example.com,https://*' })
      ).toThrow(/"https:\/\/\*"/);
    });

    it('is accepted when it is unset, empty, exact origins or narrower patterns', () => {
      for (const value of [
        undefined,
        '',
        ' ',
        ',',
        'https://app.example.com',
        'https://app.example.com, https://admin.example.com',
        'https://*.example.com',
        'https://app.example.com,*.example.org',
        'exp://**,myapp://*',
        'exp://app\\.example,myapp://x\\y*',
        'https://app.example.com:*',
        'https://app.example.com/*',
      ]) {
        expect(
          () => validateConfig({}, { BETTER_AUTH_TRUSTED_ORIGINS: value }),
          String(value)
        ).not.toThrow();
      }
    });

    it('is read from the environment of the process when none is given', () => {
      vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', '*');

      expect(() => validateConfig({})).toThrow(/BETTER_AUTH_TRUSTED_ORIGINS/);
    });
  });

  describe('auth', () => {
    it('is optional', () => {
      expect(() => validateConfig({}, {})).not.toThrow();
      expect(() => validateConfig({ auth: undefined }, {})).not.toThrow();
      expect(() => validateConfig({ auth: null }, {})).not.toThrow();
    });

    it('takes the result of defineAuth()', () => {
      expect(() => validateConfig({ auth: defineAuth({ plugins: [] }) }, {})).not.toThrow();
    });

    it('refuses anything else, naming defineAuth', () => {
      expect(() => validateConfig({ auth: { plugins: [] } }, {})).toThrow(/defineAuth/);
      expect(() => validateConfig({ auth: 'x' }, {})).toThrow(/defineAuth/);
    });
  });

  describe('cookies', () => {
    it('takes a boolean for crossSite and a string for domain', () => {
      expect(() =>
        validateConfig({ cookies: { crossSite: true, domain: '.example.com' } }, {})
      ).not.toThrow();
    });

    it('refuses other types', () => {
      expect(() => validateConfig({ cookies: { crossSite: 'yes' } }, {})).toThrow(
        /cookies\.crossSite/
      );
      expect(() => validateConfig({ cookies: { domain: 3 } }, {})).toThrow(/cookies\.domain/);
      expect(() => validateConfig({ cookies: 'none' }, {})).toThrow(/cookies/);
    });
  });

  describe('session', () => {
    it('takes durations as seconds or as a number and a unit', () => {
      expect(() =>
        validateConfig({ session: { expiresIn: '7d', updateAge: '1d', cookieCache: '5m' } }, {})
      ).not.toThrow();
      expect(() =>
        validateConfig({ session: { expiresIn: 3600, updateAge: '12h' } }, {})
      ).not.toThrow();
    });

    it('lets the cookie cache be switched off', () => {
      expect(() => validateConfig({ session: { cookieCache: false } }, {})).not.toThrow();
    });

    it('refuses a duration it cannot read', () => {
      for (const expiresIn of ['soon', '7 days', '-1d', 0, -5, '', '1.5d', true]) {
        expect(
          () => validateConfig({ session: { expiresIn } }, {}),
          JSON.stringify(expiresIn)
        ).toThrow(/session\.expiresIn/);
      }

      expect(() => validateConfig({ session: { updateAge: 'x' } }, {})).toThrow(
        /session\.updateAge/
      );
      expect(() => validateConfig({ session: { cookieCache: 'x' } }, {})).toThrow(
        /session\.cookieCache/
      );
    });
  });

  describe('rateLimit', () => {
    it('stores in the database or in memory', () => {
      expect(() => validateConfig({ rateLimit: { storage: 'database' } }, {})).not.toThrow();
      expect(() => validateConfig({ rateLimit: { storage: 'memory' } }, {})).not.toThrow();
    });

    it('refuses any other store', () => {
      expect(() => validateConfig({ rateLimit: { storage: 'redis' } }, {})).toThrow(
        /rateLimit\.storage/
      );
    });
  });

  describe('the switches', () => {
    it('are booleans', () => {
      expect(() =>
        validateConfig({ explain: true, compat: { usersPermissions: true } }, {})
      ).not.toThrow();

      expect(() => validateConfig({ explain: 'on' }, {})).toThrow(/explain/);
      expect(() => validateConfig({ compat: { usersPermissions: 'yes' } }, {})).toThrow(
        /compat\.usersPermissions/
      );
    });

    it('take a cut-off date for the legacy JWT as a date or nothing', () => {
      expect(() =>
        validateConfig({ compat: { legacyJwt: { until: '2027-06-30', secret: 's' } } }, {})
      ).not.toThrow();
      expect(() => validateConfig({ compat: { legacyJwt: { until: null } } }, {})).not.toThrow();
      expect(() => validateConfig({ compat: { legacyJwt: { until: 'someday' } } }, {})).toThrow(
        /compat\.legacyJwt\.until/
      );
    });

    describe('compat', () => {
      const compat = (value: Record<string, unknown>) => ({ compat: value });

      it('needs a secret for the legacy tokens once a cut-off is set', () => {
        expect(() =>
          validateConfig(compat({ legacyJwt: { until: '2027-06-30', secret: '' } }), {})
        ).toThrow(/compat\.legacyJwt\.secret/);
        expect(() => validateConfig(compat({ legacyJwt: { until: '2027-06-30' } }), {})).toThrow(
          /compat\.legacyJwt\.secret/
        );
        expect(() => validateConfig(compat({ legacyJwt: { secret: '' } }), {})).not.toThrow();
      });

      it('takes one of three algorithms for the legacy tokens', () => {
        expect(() =>
          validateConfig(compat({ legacyJwt: { algorithm: 'HS384' } }), {})
        ).not.toThrow();
        expect(() => validateConfig(compat({ legacyJwt: { algorithm: 'RS256' } }), {})).toThrow(
          /compat\.legacyJwt\.algorithm/
        );
      });

      it('takes one of three sameSite values for the refresh cookie', () => {
        expect(() =>
          validateConfig(compat({ refresh: { cookie: { sameSite: 'none' } } }), {})
        ).not.toThrow();
        expect(() =>
          validateConfig(compat({ refresh: { cookie: { sameSite: 'weird' } } }), {})
        ).toThrow(/compat\.refresh\.cookie\.sameSite/);
      });

      it('takes a positive whole number of seconds as the cookie maxAge', () => {
        expect(() =>
          validateConfig(compat({ refresh: { cookie: { maxAge: 3600 } } }), {})
        ).not.toThrow();

        for (const maxAge of [0, -5, 1.5, '60']) {
          expect(() => validateConfig(compat({ refresh: { cookie: { maxAge } } }), {})).toThrow(
            /compat\.refresh\.cookie\.maxAge/
          );
        }
      });

      it('takes absolute URLs as connect callbacks', () => {
        expect(() =>
          validateConfig(
            compat({ connect: { callbacks: { github: 'https://app.example.com/cb' } } }),
            {}
          )
        ).not.toThrow();

        for (const url of ['/relative', 'not a url', 'ftp://app.example.com', 42]) {
          expect(() =>
            validateConfig(compat({ connect: { callbacks: { github: url } } }), {})
          ).toThrow(/compat\.connect\.callbacks\["github"\]/);
        }
      });

      it('names the key of a refresh switch that is not a boolean', () => {
        expect(() => validateConfig(compat({ refresh: { enabled: 'yes' } }), {})).toThrow(
          /compat\.refresh\.enabled/
        );
        expect(() => validateConfig(compat({ refresh: { httpOnly: 1 } }), {})).toThrow(
          /compat\.refresh\.httpOnly/
        );
      });
    });
  });
});

describe('appName', () => {
  it('is an optional string', () => {
    expect(() => validateConfig({ appName: 'My App' }, {})).not.toThrow();
    expect(() => validateConfig({ appName: undefined }, {})).not.toThrow();
    expect(() => validateConfig({}, {})).not.toThrow();
  });

  it('refuses a value that is not a string', () => {
    expect(() => validateConfig({ appName: 42 }, {})).toThrow(/appName/);
  });
});

describe('the default configuration', () => {
  const defaults = (values: Record<string, string | undefined> = {}) =>
    (
      config.default as (args: {
        env: ((key: string) => string | undefined) & { bool: (key: string) => boolean };
      }) => Record<string, any>
    )({
      env: Object.assign((key: string) => values[key], { bool: () => false }),
    });

  it('reads the secret from END_USERS_SECRET', () => {
    expect(defaults({ END_USERS_SECRET: 'from-env' }).secret).toBe('from-env');
    expect(defaults().secret).toBeUndefined();
  });

  it('has the documented defaults', () => {
    const result = defaults();

    expect(result.trustedOrigins).toEqual([]);
    expect(result.cookies).toEqual({ crossSite: false });
    expect(result.session).toEqual({ expiresIn: '7d', updateAge: '1d', cookieCache: false });
    expect(result.compat.usersPermissions).toBe(false);
    expect(result.compat.legacyJwt.until).toBeNull();
    expect(result.compat.legacyJwt.algorithm).toBe('HS256');
    expect(result.compat.refresh.enabled).toBe(false);
    expect(result.compat.refresh.cookie.name).toBe('strapi_up_refresh');
    expect(result.compat.connect.callbacks).toEqual({});
    expect(result.explain).toBe(false);
    // Every user has a profile: there is no setting for it any more
    expect(result).not.toHaveProperty('profile');
  });

  it('leaves appName unset', () => {
    expect(defaults().appName).toBeUndefined();
    expect(Object.keys(defaults())).toContain('appName');
  });

  it('keeps the session cookie cache off, so a revoked session stops working at once', () => {
    expect(defaults().session.cookieCache).toBe(false);
  });

  it('still accepts a duration for the cookie cache, which a project may turn on', () => {
    const turnedOn = { ...defaults(), session: { ...defaults().session, cookieCache: '5m' } };

    expect(() => validateConfig(turnedOn, {})).not.toThrow();
  });

  it('leaves the rate limit store to the environment, which decides between database and memory', () => {
    expect(defaults().rateLimit?.storage).toBeUndefined();
  });

  it('turns rate limiting on in every environment by default', () => {
    expect(defaults().rateLimit.enabled).toBe(true);
    // window and max are Better Auth's own (10 seconds, 100 requests) unless configured
    expect(defaults().rateLimit.window).toBeUndefined();
    expect(defaults().rateLimit.max).toBeUndefined();

    for (const env of [{ NODE_ENV: 'production' }, { NODE_ENV: 'development' }, {}]) {
      expect(() =>
        validateConfig({ ...defaults(), secret: SECRET }, env as Record<string, string>)
      ).not.toThrow();
    }
  });

  it('takes window, max and customRules from config', () => {
    const configured = {
      enabled: false,
      window: 60,
      max: 5,
      customRules: {
        '/sign-in/email': { window: 10, max: 3 },
        '/get-session': false,
        '/sign-up/email': () => ({ window: 10, max: 3 }),
      },
    };

    expect(() => validateConfig({ rateLimit: configured }, {})).not.toThrow();
  });

  it.each([
    ['enabled', { enabled: 'yes' }, /rateLimit\.enabled/],
    ['window', { window: 0 }, /rateLimit\.window/],
    ['window as text', { window: '10s' }, /rateLimit\.window/],
    ['max', { max: 1.5 }, /rateLimit\.max/],
    ['customRules as a list', { customRules: [] }, /rateLimit\.customRules/],
    ['a custom rule that is a number', { customRules: { '/a': 3 } }, /customRules/],
    ['a custom rule without a valid max', { customRules: { '/a': { window: 1, max: 0 } } }, /max/],
  ])('refuses a bad %s', (_name, rateLimit, message) => {
    expect(() => validateConfig({ rateLimit }, {})).toThrow(message);
  });

  it('is checked by the validator Strapi calls with the merged configuration', () => {
    expect(typeof config.validator).toBe('function');
    expect(() => config.validator({ secret: 7 })).toThrow(/secret/);
  });
});
