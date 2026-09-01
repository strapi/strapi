import type { Core } from '@strapi/types';
import { generateTotp, base32Decode } from '@strapi/utils';
import createMfaService from '../mfa';
import { MFA_DEFAULTS } from '../../config/mfa';

const DEFAULT_USER_TABLE = 'admin_users';
const DEFAULT_LAST_USED_STEP_COLUMN = 'mfa_last_used_step';
const USER_UID = 'admin::user';
const RECOVERY_UID = 'admin::mfa-recovery-code';
const RECOVERY_TABLE = 'strapi_admin_mfa_recovery_codes';
const RECOVERY_USED_AT_COLUMN = 'used_at';

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

type RecoveryRow = { id: number; userId: string; codeHash: string; usedAt: Date | null };

const buildStrapi = (
  overrides: Record<string, unknown> = {},
  metadataOverrides: { tableName?: string; columnName?: string } = {},
  recoveryOverrides: {
    deleteMany?: jest.Mock;
    createMany?: jest.Mock;
    findMany?: jest.Mock;
    count?: jest.Mock;
  } = {}
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

  // A real store (not an inert no-op), so `completeEnrolment`'s recovery codes are genuinely
  // persisted here too — regressing `issueRecoveryCodes` to skip storage, not just to return
  // `[]`, would also be caught by a test that inspects `recoveryRows`. `recoveryOverrides` lets a
  // test swap in a throwing `createMany` etc. to exercise the ordering guarantee in
  // `completeEnrolment` (recovery codes before `mfaEnabledAt`).
  const recoveryRows: RecoveryRow[] = [];
  let nextRecoveryId = 1;
  const recoveryMocks = {
    deleteMany: jest.fn(async ({ where }: any) => {
      for (let i = recoveryRows.length - 1; i >= 0; i -= 1) {
        if (recoveryRows[i].userId === where.userId) recoveryRows.splice(i, 1);
      }
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const row of data) {
        recoveryRows.push({ id: nextRecoveryId, usedAt: null, ...row });
        nextRecoveryId += 1;
      }
    }),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    ...recoveryOverrides,
  };

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
      query: jest.fn((uid: string) => {
        if (uid === RECOVERY_UID) {
          return recoveryMocks;
        }

        return {
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
        };
      }),
      connection: buildConnection(users, tableName, resolveKey),
      metadata: { get: metadataGet },
      // The service's own transaction usage (`issueRecoveryCodes`) is exercised here as a plain
      // pass-through: the fixtures above already mutate a shared in-memory store synchronously,
      // so there is nothing for a fake commit/rollback to add. What this stub does prove is the
      // ordering in `completeEnrolment` — if the callback throws (a `createMany` override that
      // throws), `transaction` rejects and propagates, exactly like the real implementation.
      transaction: jest.fn(async (run: (args: { trx: unknown }) => unknown) => run({ trx: {} })),
    },
    ...overrides,
  };

  return { strapi, users, metadataGet, recoveryRows };
};

const defaultDeps = (strapi: unknown) => ({
  strapi: strapi as unknown as Core.Strapi,
  encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
  // `hashPassword` is exercised for real here because `completeEnrolment` now issues recovery
  // codes on its way to success, which hashes each one with it.
  auth: { validatePassword: async () => true, hashPassword: async (v: string) => `h:${v}` },
});

describe('mfa service: enrolment', () => {
  test('refuses to issue a secret when the encryption key is missing', async () => {
    const { strapi } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: () => null, decrypt: () => null },
      auth: { validatePassword: async () => true, hashPassword: async (v: string) => v },
    });

    await expect(service.beginEnrolment('1', 'pw')).rejects.toThrow(/encryption key/i);
  });

  test('refuses to issue a secret on a wrong password', async () => {
    const { strapi } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => false, hashPassword: async (v: string) => v },
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
    const { strapi, users, recoveryRows } = buildStrapi();
    const service = createMfaService(defaultDeps(strapi));

    const { secret } = await service.beginEnrolment('1', 'pw');
    const code = generateTotp({ secret: base32Decode(secret) });

    const result = await service.completeEnrolment('1', code);

    const stored = users.get('1')!;
    expect(stored.mfaEnabledAt).toBeInstanceOf(Date);
    expect(Number(stored.mfaLastUsedStep)).toBeGreaterThan(0);
    // Regressing `completeEnrolment` back to a hardcoded `{ recoveryCodes: [] }` must fail this:
    // the codes are real, config-sized, and genuinely persisted (not just returned).
    expect(result.recoveryCodes).toHaveLength(MFA_DEFAULTS.recoveryCodeCount);
    expect(recoveryRows).toHaveLength(MFA_DEFAULTS.recoveryCodeCount);
  });

  test('a recovery-code write failure during completeEnrolment leaves the user unenrolled and propagates', async () => {
    const { strapi, users } = buildStrapi(
      {},
      {},
      {
        createMany: jest.fn(async () => {
          throw new Error('constraint violation');
        }),
      }
    );
    const service = createMfaService(defaultDeps(strapi));

    const { secret } = await service.beginEnrolment('1', 'pw');
    const code = generateTotp({ secret: base32Decode(secret) });

    // `mfaEnabledAt` must never be set on this path: `issueRecoveryCodes` is called before it,
    // specifically so a storage failure here leaves the user free to retry rather than enrolled
    // with an empty, unrecoverable recovery-code set.
    await expect(service.completeEnrolment('1', code)).rejects.toThrow(/constraint violation/);
    expect(users.get('1')!.mfaEnabledAt).toBeNull();
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
      auth: { validatePassword: async () => true, hashPassword: async (v: string) => v },
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
      auth: { validatePassword: async () => true, hashPassword: async (v: string) => v },
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

describe('mfa service: recovery codes', () => {
  const DEFAULT_RECOVERY_CODE_COUNT = 7; // deliberately not the MFA_DEFAULTS value (10) — see
  // Finding 2: a fixture that matches the default can't distinguish "read the config" from
  // "ignore it and use the default".

  /**
   * A knex-shaped `where().whereNull().update()` builder backed by the same live `rows` array
   * `strapi.db.query(RECOVERY_UID)` reads and writes, mirroring `buildConnection` above for the
   * user table: the conditional UPDATE must see live state at the moment it runs so that, of two
   * concurrent winners racing for the same row, only the first to execute can satisfy
   * `whereNull(usedAtColumn)`. `tableName`/`columnName` are parameters, not the module-level
   * `RECOVERY_TABLE`/`RECOVERY_USED_AT_COLUMN` constants, so a test can prove the service
   * resolves these from metadata rather than hardcoding them (Finding 3).
   */
  const buildRecoveryConnection =
    (rows: RecoveryRow[], tableName: string, columnName: string) => (requestedTable: string) => {
      if (requestedTable !== tableName) {
        throw new Error(
          `Unexpected table in mock connection: got "${requestedTable}", expected "${tableName}"`
        );
      }

      let idFilter: number | undefined;
      let requireNull = false;

      const builder = {
        where(condition: Record<string, unknown>) {
          idFilter = Number(condition.id);
          return builder;
        },
        whereNull(column: string) {
          if (column !== columnName) {
            throw new Error(`Unexpected column in mock connection: ${column}`);
          }
          requireNull = true;
          return builder;
        },
        async update(data: Record<string, unknown>) {
          const row = rows.find((r) => r.id === idFilter);
          if (!row) return 0;
          if (requireNull && row.usedAt !== null) return 0;

          for (const [column, value] of Object.entries(data)) {
            if (column === columnName) row.usedAt = value as Date;
          }
          return 1;
        },
      };

      return builder;
    };

  /**
   * `db.query(RECOVERY_UID).findMany` returns snapshots (`{ ...row }`), not live references, the
   * same rule the top-of-file comment on the user mock's `findOne` explains: a snapshot is what
   * makes a read-then-write mutant in `consumeRecoveryCode` racy under `Promise.all` the way it
   * would be against a real database. If `findMany` handed out live objects instead, a mutant
   * that reads `candidate.usedAt` after `await`ing a slow bcrypt comparison would see a write the
   * other racing call already made to that same shared object, and would incorrectly refuse the
   * second call — hiding exactly the bug this suite exists to catch.
   *
   * `tableName`/`columnName` default to the real physical names but can be overridden per test
   * (Finding 3); `recoveryCodeCount` defaults to a non-default value (Finding 2).
   */
  const setup = (
    options: { tableName?: string; columnName?: string; recoveryCodeCount?: number } = {}
  ) => {
    const tableName = options.tableName ?? RECOVERY_TABLE;
    const columnName = options.columnName ?? RECOVERY_USED_AT_COLUMN;
    const recoveryCodeCount = options.recoveryCodeCount ?? DEFAULT_RECOVERY_CODE_COUNT;

    const rows: RecoveryRow[] = [];
    let nextId = 1;

    const createMany = jest.fn(async ({ data }: any) => {
      for (const row of data) {
        rows.push({ id: nextId, usedAt: null, ...row });
        nextId += 1;
      }
    });
    const deleteMany = jest.fn(async () => {
      rows.length = 0;
    });
    const findMany = jest.fn(async ({ where }: any) =>
      rows
        .filter((r) => r.userId === where.userId && r.usedAt === where.usedAt)
        .map((r) => ({ ...r }))
    );
    const count = jest.fn(
      async ({ where }: any) =>
        rows.filter((r) => r.userId === where.userId && r.usedAt === where.usedAt).length
    );

    const strapi = {
      config: { get: jest.fn(() => ({ enabled: true, recoveryCodeCount })) },
      features: { future: { isEnabled: jest.fn(() => true) } },
      log: { warn: jest.fn(), error: jest.fn() },
      db: {
        query: jest.fn((uid: string) => {
          if (uid !== RECOVERY_UID) {
            throw new Error(`Unexpected query uid in mock: ${uid}`);
          }
          return { createMany, deleteMany, findMany, count };
        }),
        connection: jest.fn(buildRecoveryConnection(rows, tableName, columnName)),
        // A plain pass-through: the fixture's `deleteMany`/`createMany` above mutate the shared
        // `rows` array synchronously regardless of any transaction, so there is nothing for a
        // fake commit/rollback to add here. What matters is that a throwing callback rejects,
        // which it does naturally since this is just `await cb(...)`.
        transaction: jest.fn(async (run: (args: { trx: unknown }) => unknown) => run({ trx: {} })),
        metadata: {
          get: jest.fn((uid: string) => {
            if (uid !== RECOVERY_UID) {
              throw new Error(`Unexpected metadata lookup in mock: ${uid}`);
            }
            return {
              tableName,
              attributes: { usedAt: { columnName } },
            };
          }),
        },
      },
    };

    return { strapi, rows, createMany };
  };

  const deps = (strapi: unknown) => ({
    strapi: strapi as never,
    encryption: { encrypt: (v: string) => v, decrypt: (v: string) => v },
    auth: {
      validatePassword: async (plain: string, hash: string) => hash === `h:${plain}`,
      hashPassword: async (plain: string) => `h:${plain}`,
    } as never,
  });

  test('issues the configured number of codes and stores only hashes', async () => {
    const { strapi, rows } = setup();
    const service = createMfaService(deps(strapi));

    const codes = await service.issueRecoveryCodes('1');

    expect(codes).toHaveLength(DEFAULT_RECOVERY_CODE_COUNT);
    expect(rows).toHaveLength(DEFAULT_RECOVERY_CODE_COUNT);
    // The plaintext must never be stored.
    for (const code of codes) {
      expect(rows.some((r) => r.codeHash === code)).toBe(false);
    }
  });

  test('a code works once and not twice', async () => {
    const { strapi } = setup();
    const service = createMfaService(deps(strapi));

    const [code] = await service.issueRecoveryCodes('1');

    expect(await service.consumeRecoveryCode('1', code)).toBe(true);
    expect(await service.consumeRecoveryCode('1', code)).toBe(false);
  });

  test('accepts a code the user typed with dashes and lowercase', async () => {
    const { strapi } = setup();
    const service = createMfaService(deps(strapi));

    const [code] = await service.issueRecoveryCodes('1');
    const messy = `${code.slice(0, 5).toLowerCase()}-${code.slice(5).toLowerCase()}`;

    expect(await service.consumeRecoveryCode('1', messy)).toBe(true);
  });

  test('rejects an unknown code', async () => {
    const { strapi } = setup();
    const service = createMfaService(deps(strapi));

    await service.issueRecoveryCodes('1');
    expect(await service.consumeRecoveryCode('1', 'ZZZZZZZZZZ')).toBe(false);
  });

  test('regenerating replaces the whole set', async () => {
    const { strapi, rows } = setup();
    const service = createMfaService(deps(strapi));

    const first = await service.issueRecoveryCodes('1');
    await service.issueRecoveryCodes('1');

    expect(rows).toHaveLength(DEFAULT_RECOVERY_CODE_COUNT);
    expect(await service.consumeRecoveryCode('1', first[0])).toBe(false);
  });

  test('reports how many unused codes remain, ignoring consumed ones', async () => {
    const { strapi } = setup();
    const service = createMfaService(deps(strapi));

    const codes = await service.issueRecoveryCodes('1');
    await service.consumeRecoveryCode('1', codes[0]);

    expect(await service.countUnusedRecoveryCodes('1')).toBe(DEFAULT_RECOVERY_CODE_COUNT - 1);
  });

  test('recoveryCodeCount: 0 deletes the old set and returns an empty array without calling createMany', async () => {
    const { strapi, rows, createMany } = setup({ recoveryCodeCount: 0 });
    const service = createMfaService(deps(strapi));

    // Seed an existing set the way a real deployment would have one before an operator turns
    // recovery codes off.
    await service.issueRecoveryCodes('1');
    createMany.mockClear();

    const codes = await service.issueRecoveryCodes('1');

    expect(codes).toEqual([]);
    expect(rows).toHaveLength(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  test('resolves the recovery-code table and the usedAt column from strapi.db.metadata rather than hardcoding them', async () => {
    const { strapi, rows } = setup({
      tableName: 'weird_recovery_table',
      columnName: 'weird_used_at',
    });
    const service = createMfaService(deps(strapi));

    const [code] = await service.issueRecoveryCodes('1');

    expect(await service.consumeRecoveryCode('1', code)).toBe(true);
    expect(rows.find((r) => r.codeHash === `h:${code}`)?.usedAt).toBeInstanceOf(Date);
  });

  test('the replay guard allows only one winner when two requests race for the same code', async () => {
    const { strapi, rows } = setup();
    const service = createMfaService(deps(strapi));

    const [code] = await service.issueRecoveryCodes('1');

    const [a, b] = await Promise.all([
      service.consumeRecoveryCode('1', code),
      service.consumeRecoveryCode('1', code),
    ]);

    // Exactly one of the two racing calls may win — a read-then-write implementation would let
    // both see the pre-write state (usedAt: null) and both return true.
    expect([a, b].sort()).toEqual([false, true]);
    expect(rows.find((r) => r.codeHash === `h:${code}`)?.usedAt).toBeInstanceOf(Date);
  });
});
