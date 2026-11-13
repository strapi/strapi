import { beforeAll, describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';

import {
  hasBackslash,
  hasWildcard,
  matchesHostPrefix,
  trustsEveryOrigin,
} from '../../../config/trusted-origins';

/**
 * `trustsEveryOrigin` (config/trusted-origins.ts) decides from the shape of a pattern what Better
 * Auth's matcher would do with it. That is only worth anything while the two agree, so this runs
 * Better Auth's own `matchesOriginPattern` (`isTrustedOrigin` of its context, which applies it to
 * the trusted origins) against canary origins and compares.
 *
 * A pattern "trusts every origin" when, for one scheme and one port, it matches every one of the
 * canary hosts: whatever host an attacker serves a page from, the pattern lets it through.
 */

// What they have in common is the dot and nothing else, so that a pattern with a literal (`*a*`)
// cannot match all of them and pass for "every host"
const HOSTS = ['evil.example', 'a.b.c', 'www.k8s.io'];
const SCHEMES = ['http', 'https'];
const PORTS = ['', ':3000', ':8443'];

/** One group per scheme and port: the same canary hosts. */
const GROUPS = SCHEMES.flatMap((scheme) =>
  PORTS.map((port) => HOSTS.map((host) => `${scheme}://${host}${port}`))
);

/** Origins with a custom scheme, which native apps use. */
const NATIVE_ORIGINS = ['exp://192.168.0.2:8081', 'myapp://callback', 'myapp://evil.example'];

let isTrusted: (pattern: string, url: string) => boolean;

beforeAll(async () => {
  const auth = betterAuth({
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    secret: 'test-secret-at-least-32-characters-long',
    baseURL: 'http://localhost:1337',
    telemetry: { enabled: false },
  });
  const context = (await auth.$context) as unknown as {
    trustedOrigins: string[];
    isTrustedOrigin: (url: string, settings?: { allowRelativePaths?: boolean }) => boolean;
  };

  // The context checks `this.trustedOrigins`, so one context serves every pattern
  isTrusted = (pattern, url) => {
    context.trustedOrigins = [pattern];

    try {
      return context.isTrustedOrigin(url);
    } catch {
      return false;
    }
  };
});

const trustsEveryHostOfAScheme = (pattern: string) =>
  GROUPS.some((group) => group.every((url) => isTrusted(pattern, url)));

const matchesAnyWebOrigin = (pattern: string) =>
  GROUPS.some((group) => group.some((url) => isTrusted(pattern, url)));

/**
 * Pattern, and whether it trusts every origin of a web scheme. Labeled by hand, so that a change
 * in Better Auth's matcher fails here and says which side moved.
 */
const CASES: Array<[pattern: string, everyOrigin: boolean]> = [
  // Only wildcards where the host belongs
  ['*', true],
  ['**', true],
  ['*?', true],
  ['?*', true],
  ['*.*', true],
  ['https://*', true],
  ['http://*', true],
  ['*://*', true],
  ['https://**', true],
  ['https://*.*', true],
  ['https://*:3000', true],
  ['https://*:*', true],
  ['*:3000', true],
  // A path after the wildcard host: the origin has no path, and these still match it
  ['https://*/*', true],
  ['https://*/**', true],
  ['http://*/**', true],
  ['*/**', true],
  ['https://*:3000/**', true],
  // An empty segment is skipped
  ['/**', true],
  ['https:///**', true],
  // A wildcard in the scheme that still matches http and https
  ['ht*://*', true],
  ['https*://*', true],
  ['?ttp*://*', true],
  // A host that is named, or a wildcard that leaves most hosts out
  ['https://*.example.com', false],
  ['https://*.example.com/**', false],
  ['*.example.com', false],
  ['https://app-*.example.com', false],
  ['https://*.example.com:8443', false],
  ['https://a*', false],
  ['https://*a', false],
  ['https://*.com', false], // every .com host, which is wide, and which the boot warning names
  ['https://*.co.uk', false],
  ['https://?', false], // one character of host
  ['?', false],
  ['??', false],
  ['?.?', false],
  ['https://*@*', false],
  ['https://*#', false],
  ['https://app.example.com', false],
  // Custom schemes match no web origin: a native app needs them
  ['exp://**', false],
  ['exp://*', false],
  ['exp://*/**', false],
  ['myapp://*', false],
  ['myapp://', false],
];

describe('trustsEveryOrigin against the matcher of Better Auth', () => {
  it.each(CASES)('%j: trusts every origin of a web scheme = %s', (pattern, everyOrigin) => {
    // What Better Auth does with it ...
    expect(trustsEveryHostOfAScheme(pattern), `Better Auth, ${pattern}`).toBe(everyOrigin);

    // ... and what the plugin says about it
    expect(trustsEveryOrigin(pattern), `trustsEveryOrigin, ${pattern}`).toBe(everyOrigin);
  });

  // These name no host either, and a canary or two gets past them (a host with one dot, a host that
  // is not made of single letters), but every site an attacker can give a subdomain or a short name
  // is still let through, so they are refused all the same
  it.each(['*.*.*', '*.*.*.*', '*.?', '*?.?', 'https://*.*.*'])(
    '%j names no host, so it is refused though it does not match every canary',
    (pattern) => {
      expect(trustsEveryHostOfAScheme(pattern), `Better Auth, ${pattern}`).toBe(false);
      expect(trustsEveryOrigin(pattern), `trustsEveryOrigin, ${pattern}`).toBe(true);
    }
  );

  it('refuses nothing that matches no web origin at all, native app patterns included', () => {
    for (const pattern of [
      'exp://**',
      'exp://*',
      'exp://*/**',
      'myapp://*',
      'myapp://evil.example',
    ]) {
      expect(matchesAnyWebOrigin(pattern), pattern).toBe(false);
      expect(trustsEveryOrigin(pattern), pattern).toBe(false);
    }

    // they do match what they are for, and they are wildcard patterns, so the boot warning names them
    expect(isTrusted('exp://**', NATIVE_ORIGINS[0])).toBe(true);
    expect(isTrusted('myapp://*', NATIVE_ORIGINS[1])).toBe(true);
    expect(hasWildcard('exp://**')).toBe(true);
    expect(hasWildcard('myapp://*')).toBe(true);
  });

  /**
   * Every pattern made of these parts, as Better Auth would read it: the ones that trust every host
   * of a scheme must all be refused. This is the direction that matters; the other one is not
   * asserted here, because some of these patterns match nothing (`https://*\\*` has to be an
   * asterisk) and are refused all the same, which costs nobody anything.
   */
  describe('everything that trusts every host of a scheme is refused', () => {
    const SCHEME_PARTS = [
      '',
      'http://',
      'https://',
      '*://',
      'ht*://',
      'https*://',
      '?ttps://',
      'HTTPS://',
      'https:///',
      'exp://',
      'myapp://',
    ];
    const HOST_PARTS = [
      '',
      '*',
      '**',
      '?',
      '*?',
      '?*',
      '*.*',
      '**.**',
      '*.',
      '.*',
      '*.*.*',
      '*.?',
      '?.?',
      '*:*',
      '*:3000',
      '*:?',
      '*.com',
      '*.example',
      '*.example.com',
      'a*',
      '*a',
      'x*',
      '/**',
      '//**',
      '\\',
      '*\\',
      '*\\.*',
      '*@*',
      '*#',
    ];
    const TAIL_PARTS = [
      '',
      '/',
      '/*',
      '/**',
      '/*/**',
      '\\',
      '//',
      '/x',
      '/x/**',
      '*',
      ':3000',
      ':*',
      '/**/',
    ];

    const patterns = SCHEME_PARTS.flatMap((scheme) =>
      HOST_PARTS.flatMap((host) => TAIL_PARTS.map((tail) => `${scheme}${host}${tail}`))
    );

    it('covers a few thousand patterns', () => {
      expect(new Set(patterns).size).toBeGreaterThan(2000);
    });

    // A backslash is refused wherever it is (`hasBackslash`), so `trustsEveryOrigin` does not have to
    // read what an escape does; the patterns with one are covered by that
    it('has none that Better Auth trusts for every host and nothing refuses', () => {
      const slipped = [...new Set(patterns)].filter(
        (pattern) =>
          trustsEveryHostOfAScheme(pattern) && !trustsEveryOrigin(pattern) && !hasBackslash(pattern)
      );

      expect(slipped).toEqual([]);
    });

    it('has no custom-scheme pattern that matches a web origin, so none needs refusing', () => {
      const custom = [...new Set(patterns)].filter((pattern) => /^(exp|myapp):\/\//.test(pattern));

      expect(custom.length).toBeGreaterThan(100);
      expect(custom.filter(matchesAnyWebOrigin)).toEqual([]);
      expect(custom.filter(trustsEveryOrigin)).toEqual([]);
    });
  });
});

/**
 * A trailing `/**` makes Better Auth match a prefix of the host, and so does a host that ends in
 * a `*`: `https://app.example.com/**` trusts `https://app.example.com.evil.net`, a name anyone can
 * register. These canaries are all under `evil.net`, which no pattern here names, so a pattern that
 * trusts one of them lets through a host that is not under its own.
 */
describe('matchesHostPrefix against the matcher of Better Auth', () => {
  const FOREIGN_HOSTS = [
    'app.example.com.evil.net',
    'x.example.com.evil.net',
    'app.example.evil.net',
    'app.evil.net',
    'x.evil.net',
    '192.168.1.5.evil.net',
  ];
  const CANARIES = SCHEMES.flatMap((scheme) =>
    PORTS.flatMap((port) => FOREIGN_HOSTS.map((host) => `${scheme}://${host}${port}`))
  );

  const trustsAForeignHost = (pattern: string) => CANARIES.some((url) => isTrusted(pattern, url));
  const refused = (pattern: string) =>
    trustsEveryOrigin(pattern) || matchesHostPrefix(pattern) || hasBackslash(pattern);

  /** Pattern, and whether it trusts a host that is not under its own (and so must be refused). */
  const PREFIX_CASES: Array<[pattern: string, prefix: boolean]> = [
    // A `**` segment right after the host
    ['https://app.example.com/**', true],
    ['http://app.example.com/**', true],
    ['https://app.example.com/**/**', true],
    ['https://app.example.com\\/**', true],
    ['https://*.example.com/**', true],
    ['app.example.com/**', true],
    ['*.example.com/**', true],
    // A host that ends in a wildcard
    ['https://app.example.com*', true],
    ['https://app.example.com**', true],
    ['https://app.example.com*?', true],
    ['https://app*', true],
    ['https://app.example.*', true],
    ['http://192.168.1.*', true],
    ['http://192.168.*.*', true],
    ['https://app.example.com*:3000', true],
    ['app.example.com*', true],
    // An escape in the middle of the host hides the `*` that ends it from anything that cuts at the
    // backslash: Better Auth reads `\.` as a dot, and the entry is still a start of a host
    ['https://app\\.example.com*', true],
    ['https://app\\.example.com*:3000', true],
    ['https://app\\.example.*', true],
    ['https://app\\.example.com*?', true],
    ['https://a\\pp.example.com*', true],
    ['app\\.example.com*', true],
    ['http://192\\.168\\.1\\.*', true],
    ['https://*\\.example.*', true],
    // Anchored at the end of the host, or a path that matches nothing
    ['https://app.example.com', false],
    ['https://app.example.com/', false],
    ['https://app.example.com/*', false],
    ['https://app.example.com/*/**', false],
    ['https://app.example.com/x/**', false],
    ['https://app.example.com//**', false],
    ['https://*.example.com', false],
    ['https://*.example.com:8443', false],
    ['*.example.com', false],
    ['https://app-*.example.com', false],
    ['https://app-?.example.com', false],
    ['https://app.example.com?', false], // one character, not a suffix of any length
    ['https://app.example.co?', false],
    // Escaped, and anchored all the same
    ['https://app\\.example.com', false],
    ['https://*\\.example.com', false],
    ['https://app\\.example.com/*', false],
    ['https://app\\.example.com:*', false],
    ['https://app.example.com:*', false], // a port, which has to follow a colon
    ['https://app.example.com:3000/**', false], // the port is literal, so the host is fixed
    ['https://app.example.com:*/**', false],
    ['https://app.example.com:?', false],
    // Custom schemes match no web origin
    ['exp://*/**', false],
    ['exp://**', false],
    ['myapp://*', false],
  ];

  it.each(PREFIX_CASES)('%j: trusts a host not under its own = %s', (pattern, prefix) => {
    // What Better Auth does with it ...
    expect(trustsAForeignHost(pattern), `Better Auth, ${pattern}`).toBe(prefix);

    // ... and what the plugin says about it
    expect(matchesHostPrefix(pattern), `matchesHostPrefix, ${pattern}`).toBe(prefix);
  });

  it('leaves an entry with no wildcard alone: it is compared as written', () => {
    for (const pattern of [
      'https://app.example.com',
      'http://localhost:5173',
      'myapp://callback',
    ]) {
      expect(matchesHostPrefix(pattern), pattern).toBe(false);
      expect(trustsAForeignHost(pattern), pattern).toBe(false);
    }
  });

  describe('every entry that trusts a host not under its own is refused', () => {
    const SCHEME_PARTS = ['', 'http://', 'https://', '*://', 'ht*://', 'https:///'];
    const HOST_PARTS = [
      'app.example.com',
      'x.example.com',
      '*.example.com',
      'app-*.example.com',
      'app.example.*',
      '*.example.*',
      'app*',
      'x*',
      'app.example.com*',
      'app.example.com*?',
      'app.example.com?',
      'app\\.example.com',
      'app\\.example.com*',
      'a\\pp.example.com*',
      'app\\.example.*',
      'app\\.example.com*?',
      '192\\.168\\.1\\.*',
      '*\\.example.com',
      'app\\.example.com:*',
      '192.168.1.*',
      '192.168.*.*',
      'app.example.com:*',
      'app.example.com:3000',
      'app.example.com*:3000',
    ];
    const TAIL_PARTS = [
      '',
      '/',
      '/*',
      '/**',
      '/**/',
      '/**/**',
      '/**/x',
      '/*/**',
      '/x',
      '/x/**',
      '//**',
      '\\',
      '\\/**',
      '*',
      '**',
      '?',
      ':3000',
      ':*',
    ];

    const patterns = [
      ...new Set(
        SCHEME_PARTS.flatMap((scheme) =>
          HOST_PARTS.flatMap((host) => TAIL_PARTS.map((tail) => `${scheme}${host}${tail}`))
        )
      ),
    ];

    it('covers over a thousand patterns, a good part of which do trust a foreign host', () => {
      expect(patterns.length).toBeGreaterThan(1000);
      expect(patterns.filter(trustsAForeignHost).length).toBeGreaterThan(200);
    });

    it('has none that Better Auth trusts for a foreign host and the plugin lets through', () => {
      const slipped = patterns.filter(
        (pattern) => trustsAForeignHost(pattern) && !refused(pattern)
      );

      expect(slipped).toEqual([]);
    });
  });
});

/**
 * A backslash is an escape to Better Auth's matcher (only `/` ends a segment), so a pattern can hide
 * a trailing wildcard behind one. No real origin has a backslash, so every entry a web page can match
 * is refused if it has one; a custom scheme (a native app's deep link) is left alone.
 */
describe('hasBackslash against the matcher of Better Auth', () => {
  // Hosts under `evil.net`, with and without a port, which no pattern here names
  const HOST_CANARIES = ['https://app.example.com.evil.net', 'http://192.168.1.5.evil.net'].flatMap(
    (url) => ['', ':3000'].map((port) => `${url}${port}`)
  );

  const CASES_WITH_BACKSLASH: Array<[pattern: string, refused: boolean]> = [
    ['https://app\\.example.com*', true],
    ['https://app\\.example.com*:3000', true],
    ['https://app\\.example.*', true],
    ['https://app\\.example.com*?', true],
    ['https://a\\pp.example.com*', true],
    ['app\\.example.com*', true],
    ['http://192\\.168\\.1\\.*', true],
    ['https://app\\.example.com', true], // inert, and refused all the same
    ['https://*\\.example.com', true],
    ['https://app.example.com\\/**', true],
    ['*\\', true],
    ['https://*\\', true],
    ['\\/**', true],
    ['https://\\/*', true],
    ['ht\\tp://*', true], // an escape in a scheme that is still http
    ['h\\ttps://app.example.com', true],
    // no backslash, or a scheme that no web page has
    ['https://app.example.com', false],
    ['https://*.example.com', false],
    ['exp://app\\.example', false],
    ['exp://*\\.example', false],
    ['myapp://x\\y*', false],
    ['x\\y://*', false],
  ];

  it.each(CASES_WITH_BACKSLASH)('%j: refused for its backslash = %s', (pattern, expected) => {
    expect(hasBackslash(pattern), pattern).toBe(expected);
  });

  it('leaves custom-scheme entries with a backslash alone, as they match no web origin', () => {
    const custom = ['exp://app\\.example', 'exp://*\\.example', 'myapp://x\\y*'];

    expect(
      custom.filter((pattern) => HOST_CANARIES.some((url) => isTrusted(pattern, url)))
    ).toEqual([]);
    expect(custom.filter(hasBackslash)).toEqual([]);
  });

  it('refuses every one of the backslash patterns that Better Auth trusts a foreign host with', () => {
    const trusted = CASES_WITH_BACKSLASH.filter(([pattern]) =>
      HOST_CANARIES.some((url) => isTrusted(pattern, url))
    );

    expect(trusted.map(([pattern]) => pattern)).toEqual(
      expect.arrayContaining([
        'https://app\\.example.com*',
        'https://app\\.example.com*:3000',
        'https://app\\.example.*',
        'https://app\\.example.com*?',
        'https://a\\pp.example.com*',
        'app\\.example.com*',
        'http://192\\.168\\.1\\.*',
      ])
    );

    for (const [pattern] of trusted) {
      expect(hasBackslash(pattern), pattern).toBe(true);
    }
  });
});
