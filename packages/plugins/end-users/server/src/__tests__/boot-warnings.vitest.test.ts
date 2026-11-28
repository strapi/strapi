import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import {
  logBootWarnings,
  warnAboutCrossSiteCookies,
  warnAboutProxy,
  warnAboutShortSecret,
  warnAboutSyntheticActionClashes,
  warnAboutWildcardOrigins,
} from '../boot-warnings';

const fakeStrapi = (
  values: Record<string, unknown>,
  { actions = [], syntheticActions = [] }: { actions?: string[]; syntheticActions?: string[] } = {}
) => {
  const warn = vi.fn();

  // Core's action registries: the route actions, and `read-drafts` / `publish` of each draft &
  // publish type
  const registry = (keys: string[]) => ({
    keys: () => [...keys],
    has: (key: string) => keys.includes(key),
  });

  const strapi = {
    config: {
      get: (path: string, fallback?: unknown) => (path in values ? values[path] : fallback),
    },
    log: { warn },
    contentAPI: {
      permissions: {
        providers: { action: registry(actions), syntheticAction: registry(syntheticActions) },
      },
    },
  } as unknown as Core.Strapi;

  return { strapi, warn };
};

const cors = (config?: Record<string, unknown>) =>
  config === undefined ? 'strapi::cors' : { name: 'strapi::cors', config };

const withCors = (entry: unknown) => ({
  'plugin::end-users.cookies.crossSite': true,
  middlewares: ['strapi::logger', 'strapi::errors', entry, 'strapi::body'],
});

describe('warnAboutCrossSiteCookies', () => {
  describe('warns when cookies.crossSite is on and CORS answers every origin with credentials', () => {
    it.each([
      ['the default configuration of strapi::cors', cors()],
      ['an explicit wildcard', cors({ origin: '*' })],
      ['a wildcard in a list', cors({ origin: ['https://app.example.com', '*'] })],
      ['a wildcard in a comma separated list', cors({ origin: 'https://a.example.com, *' })],
      ['a wildcard with credentials on', cors({ origin: '*', credentials: true })],
      ['a configuration that sets the origin to nothing', cors({ origin: undefined })],
      ['a configuration that leaves the origin out', cors({ maxAge: 10 })],
    ])('%s', (_name, entry) => {
      const { strapi, warn } = fakeStrapi(withCors(entry));

      warnAboutCrossSiteCookies(strapi);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/cookies\.crossSite/);
      expect(warn.mock.calls[0][0]).toMatch(/strapi::cors/);
      expect(warn.mock.calls[0][0]).toMatch(/origin/);
    });
  });

  describe('stays quiet', () => {
    it.each([
      ['an exact origin', cors({ origin: 'https://app.example.com' })],
      ['a list of origins', cors({ origin: ['https://a.example.com', 'https://b.example.com'] })],
      ['a function, which decides per request', cors({ origin: () => 'https://app.example.com' })],
      [
        'a wildcard without credentials, which browsers refuse for cookies',
        cors({ origin: '*', credentials: false }),
      ],
      ['credentials turned off', cors({ credentials: false })],
    ])('with %s', (_name, entry) => {
      const { strapi, warn } = fakeStrapi(withCors(entry));

      warnAboutCrossSiteCookies(strapi);

      expect(warn).not.toHaveBeenCalled();
    });

    it('when cookies.crossSite is off, whatever CORS says', () => {
      for (const crossSite of [false, undefined]) {
        const { strapi, warn } = fakeStrapi({
          ...withCors(cors()),
          'plugin::end-users.cookies.crossSite': crossSite,
        });

        warnAboutCrossSiteCookies(strapi);

        expect(warn, String(crossSite)).not.toHaveBeenCalled();
      }
    });

    it('when there is no CORS middleware at all', () => {
      const { strapi, warn } = fakeStrapi({
        'plugin::end-users.cookies.crossSite': true,
        middlewares: ['strapi::logger', 'strapi::errors', 'strapi::body'],
      });

      warnAboutCrossSiteCookies(strapi);

      expect(warn).not.toHaveBeenCalled();
    });

    it('when the middlewares are not a list it can read', () => {
      // Strapi refuses to start with any of these, so there is nothing to judge
      for (const middlewares of [null, 'strapi::cors', {}]) {
        const { strapi, warn } = fakeStrapi({
          'plugin::end-users.cookies.crossSite': true,
          middlewares,
        });

        expect(() => warnAboutCrossSiteCookies(strapi)).not.toThrow();
        expect(warn).not.toHaveBeenCalled();
      }
    });
  });

  describe('a project without a middlewares configuration', () => {
    // Strapi then runs its built-in list, where `strapi::cors` has no config of its own: any origin,
    // with credentials (register-middlewares.ts in @strapi/core)
    it('is on the built-in list, so it warns like the default configuration of strapi::cors', () => {
      for (const values of [
        { 'plugin::end-users.cookies.crossSite': true },
        { 'plugin::end-users.cookies.crossSite': true, middlewares: undefined },
      ]) {
        const { strapi, warn } = fakeStrapi(values);

        warnAboutCrossSiteCookies(strapi);

        expect(warn, JSON.stringify(Object.keys(values))).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toMatch(/cookies\.crossSite/);
        expect(warn.mock.calls[0][0]).toMatch(/strapi::cors/);
        expect(warn.mock.calls[0][0]).toMatch(/origin/);
      }
    });

    it('stays quiet when cookies.crossSite is off', () => {
      for (const crossSite of [false, undefined]) {
        const { strapi, warn } = fakeStrapi({ 'plugin::end-users.cookies.crossSite': crossSite });

        warnAboutCrossSiteCookies(strapi);

        expect(warn, String(crossSite)).not.toHaveBeenCalled();
      }
    });
  });

  it('finds the CORS middleware among custom ones', () => {
    const { strapi, warn } = fakeStrapi({
      'plugin::end-users.cookies.crossSite': true,
      middlewares: [{ resolve: './src/middlewares/mine' }, null, 42, cors()],
    });

    warnAboutCrossSiteCookies(strapi);

    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('warnAboutWildcardOrigins', () => {
  it('names every wildcard pattern in trustedOrigins, in one warning', () => {
    const { strapi, warn } = fakeStrapi({
      'plugin::end-users.trustedOrigins': [
        'https://app.example.com',
        'https://*.example.com',
        'https://admin-?.example.org',
        '*.example.net',
      ],
    });

    warnAboutWildcardOrigins(strapi, {});

    expect(warn).toHaveBeenCalledTimes(1);

    const message = warn.mock.calls[0][0];

    expect(message).toMatch(/trustedOrigins/);
    expect(message).toContain('https://*.example.com');
    expect(message).toContain('https://admin-?.example.org');
    expect(message).toContain('*.example.net');
    expect(message).not.toContain('https://app.example.com');
  });

  // The validator lets these through (a native app needs them: they match no web origin), so this
  // is where they are named
  it('names the patterns with a custom scheme, which are allowed', () => {
    const { strapi, warn } = fakeStrapi({
      'plugin::end-users.trustedOrigins': ['exp://**', 'myapp://*', 'https://app.example.com'],
    });

    warnAboutWildcardOrigins(strapi, {});

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('exp://**');
    expect(warn.mock.calls[0][0]).toContain('myapp://*');
    expect(warn.mock.calls[0][0]).not.toContain('https://app.example.com');
  });

  it('stays quiet about exact origins', () => {
    for (const trustedOrigins of [
      ['https://app.example.com', 'http://localhost:5173'],
      [],
      undefined,
      null,
    ]) {
      const { strapi, warn } = fakeStrapi({ 'plugin::end-users.trustedOrigins': trustedOrigins });

      warnAboutWildcardOrigins(strapi, {});

      expect(warn, String(trustedOrigins)).not.toHaveBeenCalled();
    }
  });

  it('does not throw on a value it cannot read: the validator is what refuses it', () => {
    for (const trustedOrigins of ['https://*.example.com', 42, {}, [42, null, '*.example.com']]) {
      const { strapi } = fakeStrapi({ 'plugin::end-users.trustedOrigins': trustedOrigins });

      expect(() => warnAboutWildcardOrigins(strapi, {}), String(trustedOrigins)).not.toThrow();
    }
  });
});

describe('warnAboutWildcardOrigins and BETTER_AUTH_TRUSTED_ORIGINS', () => {
  it('names the variable and the wildcard patterns in it, and not the exact origins', () => {
    const { strapi, warn } = fakeStrapi({});

    warnAboutWildcardOrigins(strapi, {
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://app.example.com, https://*.example.com,*.example.net',
    });

    expect(warn).toHaveBeenCalledTimes(1);

    const message = warn.mock.calls[0][0];

    expect(message).toMatch(/BETTER_AUTH_TRUSTED_ORIGINS/);
    expect(message).toContain('https://*.example.com');
    expect(message).toContain('*.example.net');
    expect(message).not.toContain('https://app.example.com');
  });

  it('warns once for the config and once for the variable, each by its own name', () => {
    const { strapi, warn } = fakeStrapi({
      'plugin::end-users.trustedOrigins': ['https://*.example.com'],
    });

    warnAboutWildcardOrigins(strapi, { BETTER_AUTH_TRUSTED_ORIGINS: 'https://*.example.org' });

    expect(warn).toHaveBeenCalledTimes(2);

    const [config, variable] = warn.mock.calls.map(([message]) => message as string);

    expect(config).toContain('https://*.example.com');
    expect(config).not.toMatch(/BETTER_AUTH_TRUSTED_ORIGINS/);
    expect(variable).toContain('https://*.example.org');
    expect(variable).toMatch(/BETTER_AUTH_TRUSTED_ORIGINS/);
  });

  it('stays quiet about an unset variable, and about exact origins in it', () => {
    for (const value of [undefined, '', ' , ', 'https://app.example.com,http://localhost:5173']) {
      const { strapi, warn } = fakeStrapi({});

      warnAboutWildcardOrigins(strapi, { BETTER_AUTH_TRUSTED_ORIGINS: value });

      expect(warn, String(value)).not.toHaveBeenCalled();
    }
  });

  it('reads the environment of the process when none is given', () => {
    vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', 'https://*.example.com');

    try {
      const { strapi, warn } = fakeStrapi({});

      logBootWarnings(strapi);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/BETTER_AUTH_TRUSTED_ORIGINS/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('warnAboutShortSecret', () => {
  it('warns on a secret shorter than 32 characters, without printing it', () => {
    const secret = 'too-short-secret';
    const { strapi, warn } = fakeStrapi({ 'plugin::end-users.secret': secret });

    warnAboutShortSecret(strapi);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/END_USERS_SECRET.*shorter than 32/);
    expect(warn.mock.calls[0][0]).not.toContain(secret);
  });

  it('warns the same in every environment', () => {
    for (const env of ['production', 'development', 'test']) {
      vi.stubEnv('NODE_ENV', env);

      const { strapi, warn } = fakeStrapi({ 'plugin::end-users.secret': 'short' });

      warnAboutShortSecret(strapi);

      expect(warn, env).toHaveBeenCalledTimes(1);
    }

    vi.unstubAllEnvs();
  });

  it('is quiet for a secret of 32 characters or more, and for none (the validator decides that)', () => {
    for (const secret of ['x'.repeat(32), 'x'.repeat(64), undefined, '']) {
      const { strapi, warn } = fakeStrapi({ 'plugin::end-users.secret': secret });

      warnAboutShortSecret(strapi);

      expect(warn).not.toHaveBeenCalled();
    }
  });
});

describe('warnAboutProxy', () => {
  it('warns when Strapi trusts a proxy without being told how many there are', () => {
    for (const maxIpsCount of [undefined, 0, null]) {
      const { strapi, warn } = fakeStrapi({
        'server.proxy.koa': true,
        'server.proxy.maxIpsCount': maxIpsCount,
      });

      warnAboutProxy(strapi);

      expect(warn, String(maxIpsCount)).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toMatch(/server\.proxy\.koa/);
      expect(warn.mock.calls[0][0]).toMatch(/maxIpsCount/);
      expect(warn.mock.calls[0][0]).toMatch(/client can choose/);
      expect(warn.mock.calls[0][0]).toMatch(/number of proxies/);
    }
  });

  it('stays quiet when maxIpsCount says how many proxies to believe', () => {
    const { strapi, warn } = fakeStrapi({
      'server.proxy.koa': true,
      'server.proxy.maxIpsCount': 1,
    });

    warnAboutProxy(strapi);

    expect(warn).not.toHaveBeenCalled();
  });

  it('stays quiet when Strapi does not trust a proxy', () => {
    for (const koa of [undefined, false]) {
      const { strapi, warn } = fakeStrapi({ 'server.proxy.koa': koa });

      warnAboutProxy(strapi);

      expect(warn).not.toHaveBeenCalled();
    }
  });
});

describe('warnAboutSyntheticActionClashes', () => {
  const SYNTHETIC = [
    'api::article.article.publish',
    'api::article.article.read-drafts',
    'api::tag.tag.publish',
    'api::tag.tag.read-drafts',
    'api::page.page.publish',
    'api::page.page.read-drafts',
  ];

  it('names, once, every content type whose own route action has the id of a synthetic action', () => {
    const { strapi, warn } = fakeStrapi(
      {},
      {
        actions: [
          'api::article.article.find',
          // A project's own `publish` route on articles and tags, and a `read-drafts` one on tags
          'api::tag.tag.publish',
          'api::article.article.publish',
          'api::tag.tag.read-drafts',
        ],
        syntheticActions: SYNTHETIC,
      }
    );

    warnAboutSyntheticActionClashes(strapi);

    expect(warn).toHaveBeenCalledTimes(1);

    const [message] = warn.mock.calls[0];

    expect(message).toMatch(/^end-users: /);
    expect(message).toContain('api::article.article (publish)');
    expect(message).toContain('api::tag.tag (publish, read-drafts)');
    expect(message).not.toContain('api::page.page');
    // What it means for whoever grants the route
    expect(message).toMatch(/one stored permission grants both/);
  });

  it('stays quiet when no route action has the id of a synthetic action', () => {
    const { strapi, warn } = fakeStrapi(
      {},
      { actions: ['api::article.article.find'], syntheticActions: SYNTHETIC }
    );

    warnAboutSyntheticActionClashes(strapi);

    expect(warn).not.toHaveBeenCalled();
  });

  // The warning says "rename the controller action": a project can do that to its own `api::` types,
  // and not to a plugin's
  it("lists a project's content types only, not a plugin's, whose action a project can't rename", () => {
    const { strapi, warn } = fakeStrapi(
      {},
      {
        actions: [
          'api::tag.tag.publish',
          'plugin::blog.post.publish',
          'plugin::blog.post.read-drafts',
          'plugin::end-users.profile.publish',
        ],
        syntheticActions: [
          ...SYNTHETIC,
          'plugin::blog.post.publish',
          'plugin::blog.post.read-drafts',
          'plugin::end-users.profile.publish',
        ],
      }
    );

    warnAboutSyntheticActionClashes(strapi);

    expect(warn).toHaveBeenCalledTimes(1);

    const [message] = warn.mock.calls[0];

    expect(message).toContain('api::tag.tag (publish)');
    expect(message).not.toContain('plugin::');
    // The text that was there stays
    expect(message).toMatch(/one stored permission grants both/);
    expect(message).toMatch(/Rename the controller action to keep them apart/);
  });

  it("stays quiet when only a plugin's route action clashes", () => {
    const { strapi, warn } = fakeStrapi(
      {},
      {
        actions: ['plugin::blog.post.publish', 'plugin::blog.post.read-drafts'],
        syntheticActions: ['plugin::blog.post.publish', 'plugin::blog.post.read-drafts'],
      }
    );

    warnAboutSyntheticActionClashes(strapi);

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('logBootWarnings', () => {
  it('runs every check, and only logs: it never throws', () => {
    const { strapi, warn } = fakeStrapi(
      {
        ...withCors(cors()),
        'server.proxy.koa': true,
        'plugin::end-users.trustedOrigins': ['https://*.example.com'],
      },
      { actions: ['api::tag.tag.publish'], syntheticActions: ['api::tag.tag.publish'] }
    );

    // an empty environment: whatever BETTER_AUTH_TRUSTED_ORIGINS is on this machine is not under test
    expect(() => logBootWarnings(strapi, {})).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('says nothing about a configuration that is fine', () => {
    const { strapi, warn } = fakeStrapi({
      ...withCors(cors({ origin: 'https://app.example.com' })),
      'server.proxy.koa': true,
      'server.proxy.maxIpsCount': 2,
    });

    logBootWarnings(strapi, {});

    expect(warn).not.toHaveBeenCalled();
  });
});
