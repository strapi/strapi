import type { Core } from '@strapi/types';
import { generateTotp, base32Decode } from '@strapi/utils';
import createMfaService from '../mfa';

const DEFAULT_USER_TABLE = 'admin_users';
const DEFAULT_LAST_USED_STEP_COLUMN = 'mfa_last_used_step';
const USER_UID = 'admin::user';

type UserRow = Record<string, unknown>;
type ResolveKey = (column: string) => string;

/**
 * A knex-shaped `whereNull`/`orWhere` builder that actually evaluates against a row, so the
 * replay-guard tests exercise the real conditional-update semantics rather than a stub that
 * always reports success. `resolveKey` translates a physical column name back to the JS
 * attribute name the row is keyed by (see `buildConnection` below for why that matters), and is
 * parameterised per test so a test can prove the service resolves names from metadata rather
 * than hardcoding them.
 */
const createNestedWhereBuilder = (resolveKey: ResolveKey) => {
  const predicates: Array<(row: UserRow) => boolean> = [];

  const self = {
    whereNull(column: string) {
      const key = resolveKey(column);
      predicates.push((row) => row[key] === null || row[key] === undefined);
      return self;
    },
    orWhere(column: string, operator: string, value: unknown) {
      const key = resolveKey(column);
      predicates.push((row) => {
        const current = row[key];
        if (current === null || current === undefined) return false;
        switch (operator) {
          case '<':
            return Number(current) < Number(value);
          case '<=':
            return Number(current) <= Number(value);
          case '>':
            return Number(current) > Number(value);
          case '>=':
            return Number(current) >= Number(value);
          default:
            throw new Error(`Unsupported operator in mock: ${operator}`);
        }
      });
      return self;
    },
    test(row: UserRow): boolean {
      // Every condition after the first is joined with OR in this mock, matching the single
      // `whereNull(...).orWhere(...)` chain the replay guard actually issues.
      return predicates.some((predicate) => predicate(row));
    },
  };

  return self;
};

/**
 * Builds a knex-shaped `strapi.db.connection` backed by the same in-memory `users` map as
 * `strapi.db.query`, so a conditional UPDATE really only mutates rows that satisfy every
 * `.where(...)` clause and reports the true affected-row count.
 *
 * The service reads/writes the user through two different layers: `strapi.db.query`, which
 * speaks JS attribute names (`mfaLastUsedStep`), and this raw connection, which speaks physical
 * column names (whatever `strapi.db.metadata.get(...)` reports). Both must land on the same
 * in-memory row for the replay-guard tests to mean anything, so `resolveKey` translates a
 * physical column name back to the attribute name before touching the row — same as
 * `@strapi/database`'s metadata layer does for real.
 */
const buildConnection =
  (users: Map<string, UserRow>, tableName: string, resolveKey: ResolveKey) =>
  (requestedTable: string) => {
    if (requestedTable !== tableName) {
      throw new Error(
        `Unexpected table in mock connection: got "${requestedTable}", expected "${tableName}"`
      );
    }

    const predicates: Array<(row: UserRow) => boolean> = [];

    const builder = {
      where(
        condition:
          | Record<string, unknown>
          | ((nested: ReturnType<typeof createNestedWhereBuilder>) => void)
      ) {
        if (typeof condition === 'function') {
          const nested = createNestedWhereBuilder(resolveKey);
          condition(nested);
          predicates.push((row) => nested.test(row));
        } else {
          predicates.push((row) =>
            Object.entries(condition).every(
              ([key, value]) => String(row[resolveKey(key)]) === String(value)
            )
          );
        }
        return builder;
      },
      async update(data: UserRow) {
        const translated = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [resolveKey(key), value])
        );

        let affected = 0;
        for (const row of users.values()) {
          if (predicates.every((predicate) => predicate(row))) {
            Object.assign(row, translated);
            affected += 1;
          }
        }
        return affected;
      },
    };

    return builder;
  };

const buildStrapi = (
  overrides: Record<string, unknown> = {},
  metadataOverrides: { tableName?: string; columnName?: string } = {}
) => {
  const tableName = metadataOverrides.tableName ?? DEFAULT_USER_TABLE;
  const columnName = metadataOverrides.columnName ?? DEFAULT_LAST_USED_STEP_COLUMN;
  const resolveKey: ResolveKey = (column) => (column === columnName ? 'mfaLastUsedStep' : column);

  const users = new Map<string, UserRow>();
  users.set('1', {
    id: 1,
    email: 'kai@doe.com',
    password: 'hashed',
    mfaSecret: null,
    mfaEnabledAt: null,
    mfaLastUsedStep: null,
  });

  const metadataGet = jest.fn((uid: string) => {
    if (uid !== USER_UID) {
      throw new Error(`Unexpected metadata lookup in mock: ${uid}`);
    }
    return {
      tableName,
      attributes: {
        mfaLastUsedStep: { columnName },
      },
    };
  });

  const strapi = {
    config: {
      get: jest.fn((path: string, defaultValue?: unknown) => {
        if (path === 'admin.auth.mfa') return { enabled: true };
        return defaultValue;
      }),
    },
    features: { future: { isEnabled: jest.fn(() => true) } },
    log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    db: {
      query: jest.fn(() => ({
        // A real `findOne` returns a fresh snapshot, not a live reference into storage — a
        // subsequent write elsewhere must not retroactively change what an in-flight read already
        // observed. Spreading into a new object is what makes a read-then-write mutant in
        // `consumeTotpStep` racy under `Promise.all` the way it would be against a real database;
        // returning the stored object directly let two racing reads silently share one mutable
        // object and see each other's write, masking the exact bug Finding 1 exists to catch.
        findOne: jest.fn(async ({ where }: any) => {
          const row = users.get(String(where.id));
          return row ? { ...row } : null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const user = users.get(String(where.id));
          if (!user) return null;
          Object.assign(user, data);
          return user;
        }),
      })),
      connection: buildConnection(users, tableName, resolveKey),
      metadata: { get: metadataGet },
    },
    ...overrides,
  };

  return { strapi, users, metadataGet };
};

const defaultDeps = (strapi: unknown) => ({
  strapi: strapi as unknown as Core.Strapi,
  encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
  auth: { validatePassword: async () => true },
});

describe('mfa service: enrolment', () => {
  test('refuses to issue a secret when the encryption key is missing', async () => {
    const { strapi } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: () => null, decrypt: () => null },
      auth: { validatePassword: async () => true },
    });

    await expect(service.beginEnrolment('1', 'pw')).rejects.toThrow(/encryption key/i);
  });

  test('refuses to issue a secret on a wrong password', async () => {
    const { strapi } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => false },
    });

    await expect(service.beginEnrolment('1', 'wrong')).rejects.toThrow(/invalid credentials/i);
  });

  test('stores the secret encrypted and leaves enrolment inactive', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    const result = await service.beginEnrolment('1', 'pw');

    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.otpauthUri).toContain('otpauth://totp/');
    const stored = users.get('1')!;
    expect(String(stored.mfaSecret)).toMatch(/^enc:/);
    expect(stored.mfaEnabledAt).toBeNull();
  });

  test('refuses to begin enrolment when the user is already enrolled, and writes nothing', async () => {
    const { strapi, users } = buildStrapi();
    const existing = users.get('1')!;
    existing.mfaSecret = 'enc:existing-secret';
    existing.mfaEnabledAt = new Date('2026-01-01T00:00:00.000Z');
    existing.mfaLastUsedStep = 42;
    const snapshot = { ...existing };

    const service = createMfaService(defaultDeps(strapi));

    await expect(service.beginEnrolment('1', 'pw')).rejects.toThrow(/already enabled/i);
    // Nothing was written: refusing must happen before any update, not just before completion.
    expect(users.get('1')).toEqual(snapshot);
  });

  test('begins enrolment successfully for a never-enrolled user', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    await expect(service.beginEnrolment('1', 'pw')).resolves.toEqual(
      expect.objectContaining({
        secret: expect.stringMatching(/^[A-Z2-7]+$/),
        otpauthUri: expect.stringContaining('otpauth://totp/'),
      })
    );
    expect(users.get('1')!.mfaEnabledAt).toBeNull();
  });

  test('activates enrolment only after a valid code and records the consumed step', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    const { secret } = await service.beginEnrolment('1', 'pw');
    const code = generateTotp({ secret: base32Decode(secret) });

    await service.completeEnrolment('1', code);

    const stored = users.get('1')!;
    expect(stored.mfaEnabledAt).toBeInstanceOf(Date);
    expect(Number(stored.mfaLastUsedStep)).toBeGreaterThan(0);
  });

  test('rejects an invalid code and leaves enrolment inactive', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    await service.beginEnrolment('1', 'pw');
    await expect(service.completeEnrolment('1', '000000')).rejects.toThrow(/invalid/i);
    expect(users.get('1')!.mfaEnabledAt).toBeNull();
  });

  test('treats an undecryptable secret as a recoverable per-user fault', async () => {
    const { strapi, users } = buildStrapi();
    users.get('1')!.mfaSecret = 'enc:garbage';
    users.get('1')!.mfaEnabledAt = new Date();

    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: () => null },
      auth: { validatePassword: async () => true },
    });

    await expect(service.verifyTotpForUser('1', '123456')).rejects.toThrow(/could not be read/i);
  });

  test('treats a decrypt that throws (malformed stored value) as the same recoverable per-user fault', async () => {
    const { strapi, users } = buildStrapi();
    users.get('1')!.mfaSecret = 'v0:truncated';
    users.get('1')!.mfaEnabledAt = new Date();

    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: {
        encrypt: (v: string) => `enc:${v}`,
        decrypt() {
          // Mirrors the real encryption service, which throws for an unsupported version tag or
          // a malformed value instead of returning null — see services/encryption.ts.
          throw new Error('Unsupported encryption version: v0');
        },
      },
      auth: { validatePassword: async () => true },
    });

    await expect(service.verifyTotpForUser('1', '123456')).rejects.toThrow(/could not be read/i);
  });

  test('the replay guard rejects a second, sequential attempt to consume the same step', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    const step = 123456;
    const first = await service.consumeTotpStep('1', step);
    const second = await service.consumeTotpStep('1', step);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(Number(users.get('1')!.mfaLastUsedStep)).toBe(step);
  });

  test('the replay guard allows only one winner when two requests race for the same step', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    const step = 123456;
    const [a, b] = await Promise.all([
      service.consumeTotpStep('1', step),
      service.consumeTotpStep('1', step),
    ]);

    // Exactly one of the two racing calls may win — a read-then-write implementation would let
    // both see the pre-write state and both return true.
    expect([a, b].sort()).toEqual([false, true]);
    expect(Number(users.get('1')!.mfaLastUsedStep)).toBe(step);
  });

  test('resolves the user table and the last-used-step column from strapi.db.metadata rather than hardcoding them', async () => {
    const { strapi, users, metadataGet } = buildStrapi(
      {},
      { tableName: 'weird_users_table', columnName: 'weird_step_col' }
    );
    const service = createMfaService(defaultDeps(strapi));

    const step = 999;
    const consumed = await service.consumeTotpStep('1', step);

    expect(consumed).toBe(true);
    expect(metadataGet).toHaveBeenCalledWith(USER_UID);
    expect(Number(users.get('1')!.mfaLastUsedStep)).toBe(step);
  });
});

describe('mfa service: isEnabled', () => {
  test('is off when the future flag is off, even if config.enabled is true', () => {
    const { strapi } = buildStrapi({
      features: { future: { isEnabled: jest.fn(() => false) } },
    });
    const service = createMfaService(defaultDeps(strapi));

    expect(service.isEnabled()).toBe(false);
  });

  test('is off when the future flag is on but config.enabled is false', () => {
    const { strapi } = buildStrapi({
      config: {
        get: jest.fn((path: string, defaultValue?: unknown) =>
          path === 'admin.auth.mfa' ? { enabled: false } : defaultValue
        ),
      },
    });
    const service = createMfaService(defaultDeps(strapi));

    expect(service.isEnabled()).toBe(false);
  });

  test('is on only when the future flag is on and config.enabled is true', () => {
    const { strapi } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    expect(service.isEnabled()).toBe(true);
  });
});
