import { scrub, REDACTED } from '../redact';

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

  it('never writes through the __proto__ setter', () => {
    const r = scrub({ ['__proto__']: { polluted: true }, safe: 1 });
    expect(({} as any).polluted).toBeUndefined();
    expect(r).toEqual({ safe: 1 });
  });
});
