import { scrub, REDACTED } from '../redact';

// scrub() returns `unknown` by design (it scrubs arbitrary input); route the
// object cases through this typed helper instead of casting at every call site.
const scrubObject = (value: unknown, options?: Parameters<typeof scrub>[1]) =>
  scrub(value, options) as Record<string, unknown>;

describe('debug-dump scrub', () => {
  it('masks values under secret-named keys, preserving the key', () => {
    const out = scrub({ apiToken: { salt: 'abc' }, password: 'p', keep: 'v' }) as any;
    expect(out.apiToken).toBe(REDACTED);
    expect(out.password).toBe(REDACTED);
    expect(out.keep).toBe('v');
  });

  it('masks explicit sensitive subtrees by dotted path', () => {
    const out = scrub(
      {
        server: { app: { keys: ['k1', 'k2'] } },
        database: { connection: { connection: { password: 'x' } } },
      },
      { extraPaths: ['server.app.keys', 'database.connection.connection'] }
    ) as any;
    expect(out.server.app.keys).toBe(REDACTED);
    expect(out.database.connection.connection).toBe(REDACTED);
  });

  it('masks secret-looking string values under innocuous keys', () => {
    const jwt = 'eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM';
    const out = scrub({ note: jwt, url: 'https://user:pass@host/db' }) as any;
    expect(out.note).toBe(REDACTED);
    expect(out.url).toBe(REDACTED);
  });

  it('relativizes absolute paths under appRoot', () => {
    const out = scrub(
      { path: '/home/alice/app/src/index.js' },
      { appRoot: '/home/alice/app' }
    ) as any;
    expect(out.path).toBe('<app>/src/index.js');
  });

  it('leaves non-secret primitives and structure intact', () => {
    const out = scrub({ port: 1337, list: [1, 2, 3], nested: { ok: true } });
    expect(out).toEqual({ port: 1337, list: [1, 2, 3], nested: { ok: true } });
  });

  it('does not mutate the input', () => {
    const input = { password: 'p' };
    scrub(input);
    expect(input.password).toBe('p');
  });

  it('collapses a secret-named container wholesale, even for unpredictable inner keys', () => {
    const out = scrub({ providerOptions: { auth: { user: 'bob', pass: 'hunter2' } } }) as any;
    expect(out.providerOptions).toBe(REDACTED);
  });

  it('redacts non-plain-object values (e.g. a Buffer) instead of walking or passing them through', () => {
    expect((scrub({ blob: Buffer.from('x') }) as any).blob).toBe(REDACTED);
  });

  it('does not redact semver version strings', () => {
    expect(scrub({ version: '18.3.1', strapi: '5.50.1' })).toEqual({
      version: '18.3.1',
      strapi: '5.50.1',
    });
  });

  it('still redacts a real JWT (eyJ-prefixed header segment)', () => {
    const jwt = 'eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM';
    expect(scrub({ note: jwt })).toEqual({ note: REDACTED });
  });

  it('relativizes absolute paths under the home dir', () => {
    expect(scrub('/home/alice/proj/ca.pem', { homeDir: '/home/alice' })).toBe('<home>/proj/ca.pem');
  });

  it('prefers appRoot over homeDir when a path falls under both', () => {
    expect(scrub('/home/alice/app/x', { appRoot: '/home/alice/app', homeDir: '/home/alice' })).toBe(
      '<app>/x'
    );
  });

  it('leaves a system path outside app/home untouched', () => {
    expect(scrub('/var/log/strapi/app.log', { appRoot: '/srv/app', homeDir: '/home/deploy' })).toBe(
      '/var/log/strapi/app.log'
    );
  });

  it('relativizes Windows app and home paths (backslash separators)', () => {
    expect(
      scrub('C:\\Users\\alice\\app\\src\\index.js', {
        appRoot: 'C:\\Users\\alice\\app',
        homeDir: 'C:\\Users\\alice',
      })
    ).toBe('<app>\\src\\index.js');
    expect(
      scrub('C:\\Users\\alice\\.ssh\\id_rsa', {
        appRoot: 'D:\\srv\\app',
        homeDir: 'C:\\Users\\alice',
      })
    ).toBe('<home>\\.ssh\\id_rsa');
  });

  it('never writes through the __proto__ setter', () => {
    const r = scrub({ ['__proto__']: { polluted: true }, safe: 1 });
    expect(({} as any).polluted).toBeUndefined();
    expect(r).toEqual({ safe: 1 });
  });

  it('masks credential-shaped keys outside known secret containers', () => {
    expect(scrubObject({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE' }).accessKeyId).toBe(REDACTED);
    // nested SMTP auth.pass (Ben's case) — auth is not a secret container, pass is
    expect(scrub({ auth: { pass: 'hunter2', user: 'admin' } })).toEqual({
      auth: { pass: REDACTED, user: 'admin' },
    });
    expect(scrub({ smtp: { pwd: 'x' } })).toEqual({ smtp: { pwd: REDACTED } });
    expect(scrubObject({ passwd: 'x' }).passwd).toBe(REDACTED);
    expect(scrubObject({ mnemonic: 'word word word' }).mnemonic).toBe(REDACTED);
    expect(scrubObject({ authorization: 'Bearer abc' }).authorization).toBe(REDACTED);
    expect(scrub({ sentry: { dsn: 'https://k@o.ingest.sentry.io/1' } })).toEqual({
      sentry: { dsn: REDACTED },
    });
  });

  it('masks well-known provider secret values under innocuous keys', () => {
    // Real-format Stripe (sk_live_) and GitLab (glpat-) sample tokens are omitted:
    // GitHub push protection flags them even as fake fixtures. Their patterns are
    // still applied by the scrubber; the shapes below exercise the same layer.
    for (const value of [
      'whsec_abcdef0123456789abcdef01', // Stripe webhook signing secret
      'ghp_0123456789abcdefABCDEF0123456789abcd', // GitHub token
      'github_pat_11ABCDEFG0123456789_abcdefghijklmnop', // GitHub fine-grained PAT
      'xoxb-1234567890-abcdefFGHIJK', // Slack token
      'AKIAIOSFODNN7EXAMPLE', // AWS access key id
      'SG.abcdefABCDEF012345.xyzXYZ0123456789abcd', // SendGrid
      'AIzaSyD-abc123_DEF456ghi789JKL', // Google API key
      'shpat_abcdef0123456789abcdef0123', // Shopify
    ]) {
      expect(scrub({ someField: value })).toEqual({ someField: REDACTED });
    }
  });

  it('does not over-redact legitimate non-secret config', () => {
    const config = {
      author: 'A Strapi developer',
      username: 'admin',
      host: 'db.internal',
      port: 5432,
      clientId: 'public-client-123',
      name: 'my-project',
      version: '5.50.2',
      environment: 'production',
      autoReload: true,
      compass: 'north',
      keyboard: 'qwerty',
    };
    expect(scrub(config)).toEqual(config);
  });

  it('masks secret-bearing URLs, PEM keys, and more shapes found by the stress-test', () => {
    // credentials in a URL authority, including empty-user (Redis)
    expect(scrubObject({ redisUrl: 'redis://:passw0rd@cache.internal:6379/0' }).redisUrl).toBe(
      REDACTED
    );
    // PEM private key block (not caught by key name)
    expect(
      scrubObject({
        ciDeployKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nAAAA\n-----END OPENSSH PRIVATE KEY-----',
      }).ciDeployKey
    ).toBe(REDACTED);
    // Slack incoming webhook + Sentry DSN (secret carried in host/path)
    expect(
      scrubObject({ hook: 'https://hooks.slack.com/services/T00/B00/XXXXXXXXXXXX' }).hook
    ).toBe(REDACTED);
    expect(
      scrubObject({ tracing: 'https://abc123def456@o12345.ingest.sentry.io/42' }).tracing
    ).toBe(REDACTED);
    // Strapi EE license key + crypto seed phrase (by key name)
    expect(scrubObject({ licenseKey: '38206b7c-a2bf-4b65-9cfb-c614d51ba28d' }).licenseKey).toBe(
      REDACTED
    );
    expect(scrubObject({ seedPhrase: 'abandon abandon abandon' }).seedPhrase).toBe(REDACTED);
    // flat camelCase password suffix, but not lowercase look-alikes
    expect(scrubObject({ smtpAuthPass: 'hunter2' }).smtpAuthPass).toBe(REDACTED);
    expect(scrub({ compass: 'north', bypass: 'on' })).toEqual({ compass: 'north', bypass: 'on' });
    // publishable (public) Stripe key stays visible
    expect(
      scrubObject({ publishableKey: 'pk_live_51NxAAAAAAAAAAAAAAAAAAAAA' }).publishableKey
    ).toBe('pk_live_51NxAAAAAAAAAAAAAAAAAAAAA');
  });
});
