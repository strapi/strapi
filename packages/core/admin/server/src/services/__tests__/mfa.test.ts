import type { Core } from '@strapi/types';
import {
  generateTotp,
  generateTotpSecret,
  base32Decode,
  base32Encode,
  errors,
} from '@strapi/utils';
import createMfaService from '../mfa';
import { MFA_DEFAULTS } from '../../config/mfa';

const DEFAULT_USER_TABLE = 'admin_users';
const DEFAULT_LAST_USED_STEP_COLUMN = 'mfa_last_used_step';
const USER_UID = 'admin::user';
const RECOVERY_UID = 'admin::mfa-recovery-code';
const RECOVERY_TABLE = 'strapi_admin_mfa_recovery_codes';
const RECOVERY_USED_AT_COLUMN = 'used_at';
const CHALLENGE_UID = 'admin::mfa-challenge';
const CHALLENGE_TABLE = 'strapi_admin_mfa_challenges';
const CHALLENGE_ATTEMPTS_COLUMN = 'attempts';
const EVENT_UID = 'admin::mfa-event';

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

interface ChallengeRow {
  id: number;
  token: string;
  userId: string;
  factorType: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  // The mock connection writes by physical column name, which is a parameter per test.
  [key: string]: unknown;
}

interface EventRow {
  id: number;
  userId: string;
  type: string;
  metadata: Record<string, unknown>;
  seenAt: Date | null;
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * Coerces a value to something orderable for the `$gt`/`$lt` family. Deliberately narrow and
 * loud: every comparison the service actually issues through `strapi.db.query` is on a datetime
 * (`expiresAt`, `createdAt`), so anything else reaching here means the mock has drifted from the
 * service. Better to fail the test than to compare as NaN, which would make every filter match
 * nothing and silently turn the throttle tests green.
 */
const asComparable = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  throw new Error(`Unsupported comparison value in mock: ${String(value)}`);
};

/**
 * A minimal `strapi.db.query` where-clause evaluator: plain equality, `null`, plus the
 * `$gt`/`$gte`/`$lt`/`$lte` operators the challenge and event queries use. Unknown operators
 * throw, so a filter the mock cannot honour can never be mistaken for one that matched nothing.
 */
const matchesWhere = (row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean =>
  Object.entries(where).every(([field, condition]) => {
    if (condition === null || condition === undefined) {
      return row[field] === null || row[field] === undefined;
    }

    if (typeof condition === 'object' && !(condition instanceof Date)) {
      return Object.entries(condition as Record<string, unknown>).every(([operator, value]) => {
        // `$in`/`$ne`'s `value` isn't a single orderable bound (an array, or the excluded value
        // itself), so both must be handled before `asComparable` -- which every other operator
        // here relies on -- ever sees them.
        if (operator === '$in') {
          return (
            Array.isArray(value) && value.map((item) => String(item)).includes(String(row[field]))
          );
        }
        if (operator === '$ne') {
          return String(row[field]) !== String(value);
        }

        const current = asComparable(row[field]);
        const bound = asComparable(value);
        switch (operator) {
          case '$gt':
            return current > bound;
          case '$gte':
            return current >= bound;
          case '$lt':
            return current < bound;
          case '$lte':
            return current <= bound;
          default:
            throw new Error(`Unsupported operator in mock: ${operator}`);
        }
      });
    }

    return String(row[field]) === String(condition);
  });

/**
 * A knex-shaped builder for the challenge table, backed by the same live `rows` array
 * `strapi.db.query(CHALLENGE_UID)` reads and writes. Two things matter here:
 *
 *  - every `.where(...)` is stored as a closure and evaluated against the **live** row at the
 *    moment `increment`/`del` runs, so `UPDATE ... SET attempts = attempts + 1 WHERE id = ? AND
 *    attempts < ?` really is one conditional statement whose affected-row count is the decision.
 *    A stub that captured the row up front, or that always reported success, would let a
 *    read-then-write implementation pass the concurrency test.
 *  - the update bodies contain no `await`, so each runs to completion before any other racing
 *    call resumes — the single-threaded stand-in for a database's row-level atomicity.
 *
 * `tableName`/`attemptsColumn` are parameters so a test can prove the service resolves them from
 * `strapi.db.metadata` rather than hardcoding them.
 */
const buildChallengeConnection =
  (rows: ChallengeRow[], tableName: string, attemptsColumn: string) => (requestedTable: string) => {
    if (requestedTable !== tableName) {
      throw new Error(
        `Unexpected table in mock connection: got "${requestedTable}", expected "${tableName}"`
      );
    }

    // Throws rather than falling through to identity, mirroring `buildRecoveryConnection`'s
    // `whereNull` guard: with an identity fallback a service that hardcoded `'attempts'` would
    // still mutate `row.attempts` and the metadata-resolution test below could never fail, so it
    // would only be enforcing the table half of the claim.
    const resolveKey = (column: string) => {
      if (column === attemptsColumn) return 'attempts';
      if (column === 'id') return 'id';
      throw new Error(
        `Unexpected column in mock connection: got "${column}", expected "${attemptsColumn}" or "id"`
      );
    };
    const predicates: Array<(row: ChallengeRow) => boolean> = [];

    const builder = {
      where(condition: Record<string, unknown> | string, operator?: string, value?: unknown) {
        if (typeof condition === 'string') {
          const key = resolveKey(condition);
          predicates.push((row) => {
            const current = Number(row[key]);
            switch (operator) {
              case '<':
                return current < Number(value);
              case '<=':
                return current <= Number(value);
              case '>':
                return current > Number(value);
              case '>=':
                return current >= Number(value);
              default:
                throw new Error(`Unsupported operator in mock: ${operator}`);
            }
          });
        } else {
          predicates.push((row) =>
            Object.entries(condition).every(
              ([key, expected]) => String(row[resolveKey(key)]) === String(expected)
            )
          );
        }
        return builder;
      },
      async increment(column: string, amount: number) {
        const key = resolveKey(column);
        let affected = 0;
        for (const row of rows) {
          if (predicates.every((predicate) => predicate(row))) {
            row[key] = Number(row[key]) + amount;
            affected += 1;
          }
        }
        return affected;
      },
      async del() {
        let affected = 0;
        for (let i = rows.length - 1; i >= 0; i -= 1) {
          if (predicates.every((predicate) => predicate(rows[i]))) {
            rows.splice(i, 1);
            affected += 1;
          }
        }
        return affected;
      },
    };

    return builder;
  };

/**
 * A knex-shaped `where().whereNull().update()` builder for the recovery-code table, backed by the
 * same live `rows` array `strapi.db.query(RECOVERY_UID)` reads and writes, mirroring
 * `buildConnection` above for the user table: the conditional UPDATE must see live state at the
 * moment it runs so that, of two concurrent winners racing for the same row, only the first to
 * execute can satisfy `whereNull(usedAtColumn)`.
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

interface FixtureOptions {
  userTableName?: string;
  userStepColumn?: string;
  recoveryTableName?: string;
  recoveryUsedAtColumn?: string;
  challengeTableName?: string;
  challengeAttemptsColumn?: string;
  /** Merged over `{ enabled: true }` and returned for `strapi.config.get('admin.auth.mfa')`. */
  mfaConfig?: Record<string, unknown>;
  recoveryOverrides?: Record<string, jest.Mock>;
  /** Lets a test swap in a throwing `update` etc. to exercise `disable`'s transaction. */
  userOverrides?: Record<string, jest.Mock>;
  strapiOverrides?: Record<string, unknown>;
}

/**
 * The one fixture for the whole suite. The challenge flow alone touches `admin::user`,
 * `admin::mfa-recovery-code`, `admin::mfa-challenge` and `admin::mfa-event`, so a fixture that
 * throws on any uid but its own cannot serve it — and two fixtures with different notions of the
 * same store would let a test pass against a world the service never sees.
 *
 * Two rules hold throughout, because the security properties under test depend on them:
 *  - every row handed out is a snapshot (`{ ...row }`), never a live reference. That is what
 *    makes a read-then-write implementation racy under `Promise.all` the way it would be against
 *    a real database; sharing one mutable object lets two racing reads see each other's write and
 *    hides exactly the bug these tests exist to catch.
 *  - every `db.connection` write path evaluates its predicates against live rows at the moment
 *    the statement runs, and reports a true affected-row count.
 */
const buildMfaFixture = (options: FixtureOptions = {}) => {
  const userTable = options.userTableName ?? DEFAULT_USER_TABLE;
  const userStepColumn = options.userStepColumn ?? DEFAULT_LAST_USED_STEP_COLUMN;
  const recoveryTable = options.recoveryTableName ?? RECOVERY_TABLE;
  const recoveryUsedAtColumn = options.recoveryUsedAtColumn ?? RECOVERY_USED_AT_COLUMN;
  const challengeTable = options.challengeTableName ?? CHALLENGE_TABLE;
  const challengeAttemptsColumn = options.challengeAttemptsColumn ?? CHALLENGE_ATTEMPTS_COLUMN;

  const resolveUserKey: ResolveKey = (column) =>
    column === userStepColumn ? 'mfaLastUsedStep' : column;

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
    switch (uid) {
      case USER_UID:
        return {
          tableName: userTable,
          attributes: { mfaLastUsedStep: { columnName: userStepColumn } },
        };
      case RECOVERY_UID:
        return {
          tableName: recoveryTable,
          attributes: { usedAt: { columnName: recoveryUsedAtColumn } },
        };
      case CHALLENGE_UID:
        return {
          tableName: challengeTable,
          attributes: { attempts: { columnName: challengeAttemptsColumn } },
        };
      default:
        throw new Error(`Unexpected metadata lookup in mock: ${uid}`);
    }
  });

  const userMocks = {
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
      // A snapshot for the same reason `findOne` returns one: a caller that keeps an update's
      // return value must not be left holding a window onto later writes.
      return { ...user };
    }),
    ...options.userOverrides,
  };

  // A real store (not an inert no-op), so `completeEnrolment`'s recovery codes are genuinely
  // persisted here too — regressing `issueRecoveryCodes` to skip storage, not just to return
  // `[]`, would also be caught by a test that inspects `recoveryRows`. `recoveryOverrides` lets a
  // test swap in a throwing `createMany` etc. to exercise the ordering guarantee in
  // `completeEnrolment` (recovery codes before `mfaEnabledAt`).
  const recoveryRows: RecoveryRow[] = [];
  let nextRecoveryId = 1;
  const recoveryMocks = {
    deleteMany: jest.fn(async ({ where }: any) => {
      let count = 0;
      for (let i = recoveryRows.length - 1; i >= 0; i -= 1) {
        if (recoveryRows[i].userId === where.userId) {
          recoveryRows.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const row of data) {
        recoveryRows.push({ id: nextRecoveryId, usedAt: null, ...row });
        nextRecoveryId += 1;
      }
      return { count: data.length };
    }),
    findMany: jest.fn(async ({ where }: any) =>
      recoveryRows
        .filter((r) => r.userId === where.userId && r.usedAt === where.usedAt)
        .map((r) => ({ ...r }))
    ),
    count: jest.fn(
      async ({ where }: any) =>
        recoveryRows.filter((r) => r.userId === where.userId && r.usedAt === where.usedAt).length
    ),
    ...options.recoveryOverrides,
  };

  const challenges: ChallengeRow[] = [];
  let nextChallengeId = 1;
  const challengeMocks = {
    create: jest.fn(async ({ data }: any) => {
      // `createdAt` is supplied by @strapi/database's timestamps subscriber, which uses
      // `_.defaults` — so it is filled in here unless the caller passed one.
      const row: ChallengeRow = { id: nextChallengeId, createdAt: new Date(), ...data };
      nextChallengeId += 1;
      challenges.push(row);
      return { ...row };
    }),
    findOne: jest.fn(async ({ where }: any) => {
      const row = challenges.find((c) => matchesWhere(c, where));
      return row ? { ...row } : null;
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      let count = 0;
      for (let i = challenges.length - 1; i >= 0; i -= 1) {
        if (matchesWhere(challenges[i], where)) {
          challenges.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    }),
    count: jest.fn(
      async ({ where }: any = {}) => challenges.filter((c) => matchesWhere(c, where)).length
    ),
  };

  const events: EventRow[] = [];
  let nextEventId = 1;
  const eventMocks = {
    create: jest.fn(async ({ data }: any) => {
      const row: EventRow = { id: nextEventId, createdAt: new Date(), ...data };
      nextEventId += 1;
      events.push(row);
      return { ...row };
    }),
    count: jest.fn(
      async ({ where }: any = {}) => events.filter((e) => matchesWhere(e, where)).length
    ),
    findMany: jest.fn(async ({ where }: any = {}) =>
      events.filter((e) => matchesWhere(e, where)).map((e) => ({ ...e }))
    ),
    // `orderBy` accepts either a single `{ field: direction }` clause or an array of them,
    // evaluated left to right until a clause actually distinguishes two rows -- the same shape
    // `areCodesAcknowledged` asks for (`createdAt` desc, `id` desc as a tiebreaker for rows
    // created in the same millisecond, which a real store's clock resolution cannot rule out).
    findOne: jest.fn(async ({ where, orderBy }: any = {}) => {
      const matches = events.filter((e) => matchesWhere(e, where)).map((e) => ({ ...e }));
      let clauses: Array<Record<string, string>> = [];
      if (Array.isArray(orderBy)) {
        clauses = orderBy;
      } else if (orderBy) {
        clauses = [orderBy];
      }

      matches.sort((a, b) => {
        for (const clause of clauses) {
          for (const [field, direction] of Object.entries(clause as Record<string, string>)) {
            const left = asComparable(a[field]);
            const right = asComparable(b[field]);
            if (left !== right) {
              return direction === 'desc' ? right - left : left - right;
            }
          }
        }
        return 0;
      });

      return matches[0] ?? null;
    }),
    // Mutates the live rows (not a snapshot), same as `deleteMany` above: `markEventsSeen` /
    // `acknowledgeCodes` tests need to observe the write through the same `events` array the
    // fixture hands back, not a copy that silently diverges from it.
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const event of events) {
        if (matchesWhere(event, where)) {
          Object.assign(event, data);
          count += 1;
        }
      }
      return { count };
    }),
  };

  const userConnection = buildConnection(users, userTable, resolveUserKey);
  const recoveryConnection = buildRecoveryConnection(
    recoveryRows,
    recoveryTable,
    recoveryUsedAtColumn
  );
  const challengeConnection = buildChallengeConnection(
    challenges,
    challengeTable,
    challengeAttemptsColumn
  );

  const strapi = {
    config: {
      get: jest.fn((path: string, defaultValue?: unknown) => {
        if (path === 'admin.auth.mfa') return { enabled: true, ...options.mfaConfig };
        return defaultValue;
      }),
    },
    features: { future: { isEnabled: jest.fn(() => true) } },
    log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    db: {
      query: jest.fn((uid: string) => {
        switch (uid) {
          case USER_UID:
            return userMocks;
          case RECOVERY_UID:
            return recoveryMocks;
          case CHALLENGE_UID:
            return challengeMocks;
          case EVENT_UID:
            return eventMocks;
          default:
            throw new Error(`Unexpected query uid in mock: ${uid}`);
        }
      }),
      connection: jest.fn((table: string) => {
        if (table === userTable) return userConnection(table);
        if (table === recoveryTable) return recoveryConnection(table);
        if (table === challengeTable) return challengeConnection(table);
        throw new Error(`Unexpected table in mock connection: ${table}`);
      }),
      metadata: { get: metadataGet },
      // A real commit/rollback, not a bare pass-through: `disable` (Task 10 fix round 1) wraps
      // three statements in one transaction specifically so a failure on the last one (the user
      // update) undoes the first two (the recovery-code and challenge deletes) rather than
      // stranding the account mid-teardown. Proving that requires the mock to actually roll back
      // on a thrown callback -- snapshot every store this suite touches before running the
      // callback, and restore all four wholesale if it rejects. On success nothing extra happens:
      // the stores already hold whatever the callback wrote, exactly like a committed transaction.
      transaction: jest.fn(async (run: (args: { trx: unknown }) => Promise<unknown>) => {
        const usersSnapshot = new Map(Array.from(users.entries(), ([id, row]) => [id, { ...row }]));
        const recoverySnapshot = recoveryRows.map((row) => ({ ...row }));
        const challengesSnapshot = challenges.map((row) => ({ ...row }));
        const eventsSnapshot = events.map((row) => ({ ...row }));

        try {
          return await run({ trx: {} });
        } catch (error) {
          users.clear();
          for (const [id, row] of usersSnapshot) users.set(id, row);
          recoveryRows.splice(0, recoveryRows.length, ...recoverySnapshot);
          challenges.splice(0, challenges.length, ...challengesSnapshot);
          events.splice(0, events.length, ...eventsSnapshot);
          throw error;
        }
      }),
    },
    ...options.strapiOverrides,
  };

  return { strapi, users, metadataGet, recoveryRows, recoveryMocks, challenges, events };
};

/** Adapter keeping the enrolment suite's call shape onto the merged fixture above. */
const buildStrapi = (
  overrides: Record<string, unknown> = {},
  metadataOverrides: { tableName?: string; columnName?: string } = {},
  recoveryOverrides: {
    deleteMany?: jest.Mock;
    createMany?: jest.Mock;
    findMany?: jest.Mock;
    count?: jest.Mock;
  } = {}
) =>
  buildMfaFixture({
    userTableName: metadataOverrides.tableName,
    userStepColumn: metadataOverrides.columnName,
    recoveryOverrides: recoveryOverrides as Record<string, jest.Mock>,
    strapiOverrides: overrides,
  });

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
   * Adapter onto the merged fixture at the top of this file. `tableName`/`columnName` default to
   * the real physical names but can be overridden per test (Finding 3), and `recoveryCodeCount`
   * defaults to a non-default value (Finding 2). Everything else — snapshot hand-outs, a live
   * conditional UPDATE — is the shared fixture's job, so the recovery suite and the challenge
   * suite cannot drift into two different notions of the same store.
   */
  const setup = (
    options: { tableName?: string; columnName?: string; recoveryCodeCount?: number } = {}
  ) => {
    const fixture = buildMfaFixture({
      recoveryTableName: options.tableName,
      recoveryUsedAtColumn: options.columnName,
      mfaConfig: {
        recoveryCodeCount: options.recoveryCodeCount ?? DEFAULT_RECOVERY_CODE_COUNT,
      },
    });

    return {
      strapi: fixture.strapi,
      rows: fixture.recoveryRows,
      createMany: fixture.recoveryMocks.createMany,
    };
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

describe('mfa service: challenge lifecycle', () => {
  /** 32 random bytes, hex-encoded. Anything shorter or non-hex is a weaker token. */
  const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

  const setup = (
    options: {
      tableName?: string;
      attemptsColumn?: string;
      mfaConfig?: Record<string, unknown>;
      /** Simulates an ENCRYPTION_KEY rotation: the stored secret can no longer be decrypted. */
      unreadableSecret?: boolean;
    } = {}
  ) => {
    const fixture = buildMfaFixture({
      challengeTableName: options.tableName,
      challengeAttemptsColumn: options.attemptsColumn,
      mfaConfig: options.mfaConfig,
    });

    // A challenge only ever exists for someone already enrolled, so the fixture user is seeded
    // that way directly rather than driven through beginEnrolment/completeEnrolment: those would
    // consume a TOTP step on the way in and quietly weaken every replay assertion below.
    const secret = generateTotpSecret();
    const user = fixture.users.get('1')!;
    user.mfaSecret = `enc:${base32Encode(secret)}`;
    user.mfaEnabledAt = new Date();

    // Spies, not bare lambdas, so a test can assert which factor was even *attempted*. `decrypt`
    // is only ever reached through `readSecret` inside `verifyTotpForUser`, and
    // `validatePassword` only through `consumeRecoveryCode`'s candidate loop, so a zero call
    // count on either is proof that branch never ran.
    const decrypt = jest.fn((v: string) => (options.unreadableSecret ? null : v.slice(4)));
    const validatePassword = jest.fn(async (plain: string, hash: string) => hash === `h:${plain}`);

    const service = createMfaService({
      strapi: fixture.strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt },
      auth: { validatePassword, hashPassword: async (plain: string) => `h:${plain}` },
    });

    return {
      ...fixture,
      service,
      secret,
      decrypt,
      validatePassword,
      validCode: () => generateTotp({ secret }),
    };
  };

  type ChallengeService = ReturnType<typeof setup>['service'];

  /**
   * Spends the entire account-scoped budget the way an attacker with a valid password would:
   * a fresh challenge every time the per-challenge cap is reached. Without the account tier this
   * loop would never need to stop.
   */
  const burnAccountBudget = async (service: ChallengeService) => {
    const perChallenge = MFA_DEFAULTS.maxChallengeAttempts;
    const perAccount = MFA_DEFAULTS.maxUserAttempts;
    let spent = 0;

    while (spent < perAccount) {
      // eslint-disable-next-line no-await-in-loop
      const { token } = await service.createChallenge('1');
      for (let i = 0; i < perChallenge && spent < perAccount; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const outcome = await service.verifyChallenge(token, '000000');
        expect(outcome).toEqual({ ok: false, reason: 'invalid' });
        spent += 1;
      }
    }

    return spent;
  };

  /** Rewinds every recorded event by `seconds`, standing in for the passage of time. */
  const ageEvents = (events: EventRow[], seconds: number) => {
    for (const event of events) {
      event.createdAt = new Date(Date.now() - seconds * 1000);
    }
  };

  test('a fresh challenge grants nothing until a code is presented', async () => {
    const { service, challenges } = setup();

    const { token, expiresIn } = await service.createChallenge('1');

    // The token is unguessable and carries the full 32 bytes: it is the only thing standing
    // between a password holder and a session, so a short or non-random token is a real finding.
    expect(token).toMatch(TOKEN_PATTERN);
    expect(expiresIn).toBe(MFA_DEFAULTS.challengeTtl);

    const row = challenges.find((c) => c.token === token)!;
    expect(row).toBeDefined();
    // Unconsumed and unattempted: creating a challenge must not be, or imply, a passed factor.
    expect(row.consumedAt).toBeNull();
    expect(row.attempts).toBe(0);
    expect(row.userId).toBe('1');
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(row.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + MFA_DEFAULTS.challengeTtl * 1000
    );

    // Holding the token buys nothing on its own. Presenting it with no code is a failed attempt,
    // not a pass and not a free retry — an implementation that short-circuited an empty code
    // before the counter (or, worse, treated "no code" as "nothing to reject") would fail here.
    await expect(service.verifyChallenge(token, '')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(challenges.find((c) => c.token === token)!.attempts).toBe(1);
  });

  test('an expired challenge is unusable', async () => {
    const { service, challenges, users, events, validCode } = setup();

    const { token } = await service.createChallenge('1');
    challenges.find((c) => c.token === token)!.expiresAt = new Date(Date.now() - 1000);

    // Rejected on read, so expiry does not depend on the sweep having run. A correct code cannot
    // revive it either — expiry is checked before anything is judged.
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: false,
      reason: 'unusable',
    });

    // Nothing was spent on a challenge that was never going to be usable: no attempt charged, no
    // TOTP step burned (so the code still works on a fresh challenge), no failure recorded
    // against the account. Checking the code first would have consumed the step and handed an
    // attacker a way to burn a legitimate user's codes through dead challenges.
    expect(challenges.find((c) => c.token === token)!.attempts).toBe(0);
    expect(users.get('1')!.mfaLastUsedStep).toBeNull();
    expect(events).toHaveLength(0);

    // An unparseable expiry fails closed too. `new Date('nonsense') <= new Date()` is false, so a
    // naive comparison would read a malformed `expiresAt` as "never expires" — a challenge that
    // outlives its window forever is the same finding as no window at all.
    challenges.find((c) => c.token === token)!.expiresAt = new Date('nonsense');
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: false,
      reason: 'unusable',
    });
    expect(challenges.find((c) => c.token === token)!.attempts).toBe(0);
  });

  test('a consumed challenge cannot be reused', async () => {
    const { service, challenges, validCode } = setup();

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: true,
      userId: '1',
    });

    // Success destroys the row, so the token cannot be presented again at all.
    expect(challenges.some((c) => c.token === token)).toBe(false);
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: false,
      reason: 'unusable',
    });
  });

  test('a challenge is single-use even when two valid factors are presented at once', async () => {
    const { service, challenges, validCode } = setup();
    const [recoveryCode] = await service.issueRecoveryCodes('1');

    const { token } = await service.createChallenge('1');

    // Two genuinely valid factors racing on one token. Both would pass their own verification, so
    // only the challenge's own single-use consume can stop the token authorising two operations.
    // A delete that ignores its affected-row count lets both through.
    const outcomes = await Promise.all([
      service.verifyChallenge(token, validCode()),
      service.verifyChallenge(token, recoveryCode),
    ]);

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(challenges.some((c) => c.token === token)).toBe(false);
  });

  test('the challenge is destroyed once its attempt cap is exhausted', async () => {
    const { service, challenges, validCode } = setup();
    const cap = MFA_DEFAULTS.maxChallengeAttempts;

    const { token } = await service.createChallenge('1');

    for (let i = 0; i < cap; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await expect(service.verifyChallenge(token, '000000')).resolves.toEqual({
        ok: false,
        reason: 'invalid',
      });
    }

    // Exactly `cap` guesses were evaluated, no more and no fewer: an off-by-one here is a free
    // extra guess per challenge, forever.
    expect(challenges.find((c) => c.token === token)!.attempts).toBe(cap);

    await expect(service.verifyChallenge(token, '000000')).resolves.toEqual({
      ok: false,
      reason: 'exhausted',
    });
    // Destroyed, not merely refused: leaving the row behind would make the cap depend on a
    // counter that some other path might reset.
    expect(challenges.some((c) => c.token === token)).toBe(false);

    // And a correct code cannot rescue an exhausted challenge — the user must start again from
    // their password, which is the point of the per-challenge tier.
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: false,
      reason: 'unusable',
    });
  });

  test('concurrent presentations cannot exceed the per-challenge cap', async () => {
    const { service, challenges } = setup();
    const cap = MFA_DEFAULTS.maxChallengeAttempts;

    const { token } = await service.createChallenge('1');

    const outcomes = await Promise.all(
      Array.from({ length: cap + 3 }, () => service.verifyChallenge(token, '000000'))
    );

    expect(outcomes.every((outcome) => outcome.ok === false)).toBe(true);

    // At most `cap` of them were actually evaluated as attempts; the rest were refused without
    // being judged. A read-then-write increment lets all cap+3 read the same pre-write counter,
    // pass the cap check and be evaluated — that is precisely the bug this test exists to catch,
    // and it is how a "5 attempts" cap becomes "as many as you can send at once".
    const evaluated = outcomes.filter((outcome) => !outcome.ok && outcome.reason === 'invalid');
    const refused = outcomes.filter(
      (outcome) => !outcome.ok && (outcome.reason === 'exhausted' || outcome.reason === 'unusable')
    );

    expect(evaluated.length).toBeLessThanOrEqual(cap);
    expect(evaluated.length + refused.length).toBe(cap + 3);

    // The counter itself never ran past the cap either (the row is normally gone by now).
    const row = challenges.find((c) => c.token === token);
    expect(row === undefined || Number(row.attempts) <= cap).toBe(true);
  });

  test('challenge recycling is capped account-wide', async () => {
    const { service, challenges, users, events, validCode } = setup();

    // An attacker who already holds an unspent challenge, created before the account filled up.
    const { token: held } = await service.createChallenge('1');

    const spent = await burnAccountBudget(service);
    expect(spent).toBe(MFA_DEFAULTS.maxUserAttempts);
    expect(events.filter((e) => e.type === 'challenge_failed')).toHaveLength(
      MFA_DEFAULTS.maxUserAttempts
    );
    expect(await service.isAccountThrottled('1')).toBe(true);

    // No new challenge: without this, the per-challenge cap is only a speed bump, since a fresh
    // challenge resets the counter and the loop above could run forever.
    await expect(service.createChallenge('1')).rejects.toBeInstanceOf(errors.RateLimitError);

    // And the already-held challenge is refused too. Throttling only createChallenge would let
    // anyone who grabbed a challenge first keep guessing straight through the account cap.
    const attemptsBefore = challenges.find((c) => c.token === held)!.attempts;
    await expect(service.verifyChallenge(held, validCode())).resolves.toEqual({
      ok: false,
      reason: 'throttled',
    });

    // Refused before anything was spent: a throttled request must not cost an attempt, and must
    // not consume the legitimate user's TOTP step — otherwise the throttle becomes a way to burn
    // the codes of the account it is supposed to protect.
    expect(challenges.find((c) => c.token === held)!.attempts).toBe(attemptsBefore);
    expect(users.get('1')!.mfaLastUsedStep).toBeNull();
  });

  test('the account cap clears once its window passes', async () => {
    const { service, events, validCode } = setup();
    const window = MFA_DEFAULTS.userAttemptWindow;

    await burnAccountBudget(service);
    expect(await service.isAccountThrottled('1')).toBe(true);

    // Still inside the window: the throttle holds. This is the assertion that catches a window
    // applied in the wrong unit — treating userAttemptWindow as milliseconds would drop
    // 14-minute-old failures out of a 15-minute window immediately.
    ageEvents(events, window - 60);
    expect(await service.isAccountThrottled('1')).toBe(true);

    // Past the window it self-clears. This is a rolling window, never a permanent lockout: a
    // locked-out admin with no way back in is an outage, not a security control.
    ageEvents(events, window + 60);
    expect(await service.isAccountThrottled('1')).toBe(false);

    const { token } = await service.createChallenge('1');
    expect(token).toMatch(TOKEN_PATTERN);
    await expect(service.verifyChallenge(token, validCode())).resolves.toEqual({
      ok: true,
      userId: '1',
    });
  });

  test('a recovery code satisfies a challenge and records the event', async () => {
    const { service, challenges, events, recoveryRows } = setup();
    const codes = await service.issueRecoveryCodes('1');

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, codes[0])).resolves.toEqual({
      ok: true,
      userId: '1',
    });

    expect(recoveryRows.find((r) => r.codeHash === `h:${codes[0]}`)!.usedAt).toBeInstanceOf(Date);
    expect(challenges.some((c) => c.token === token)).toBe(false);

    const recorded = events.filter((e) => e.type === 'recovery_code_used');
    expect(recorded).toHaveLength(1);
    expect(recorded[0].userId).toBe('1');
    // The event is a notice, not an audit of the secret material. A recorded code is a stored
    // credential in a table nobody thinks of as credential storage.
    const serialised = JSON.stringify(recorded[0]);
    for (const code of codes) {
      expect(serialised).not.toContain(code);
    }
    expect(serialised).not.toMatch(/otpauth|secret/i);

    // The spent code cannot satisfy a second challenge, but an unused one still can.
    const { token: second } = await service.createChallenge('1');
    await expect(service.verifyChallenge(second, codes[0])).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
    await expect(service.verifyChallenge(second, codes[1])).resolves.toEqual({
      ok: true,
      userId: '1',
    });
  });

  test('a totp code already consumed in another challenge is rejected as a replay', async () => {
    const { service, users, challenges, events, validCode } = setup();
    const code = validCode();

    const { token: first } = await service.createChallenge('1');
    await expect(service.verifyChallenge(first, code)).resolves.toEqual({ ok: true, userId: '1' });

    const consumedStep = Number(users.get('1')!.mfaLastUsedStep);
    expect(consumedStep).toBeGreaterThan(0);

    // CVE-2024-0227: a brand new challenge must not resurrect a code that was already spent. The
    // step is consumed per account, not per challenge, so B cannot accept it even though B has
    // its own untouched attempt counter — an implementation that scoped the replay guard to the
    // challenge would hand an observer of one code a free second login for the rest of the step.
    const { token: second } = await service.createChallenge('1');
    await expect(service.verifyChallenge(second, code)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });

    // The replayed presentation was charged as a failure at both tiers, and the recorded step is
    // unchanged (nothing rewound it to let the code work again).
    expect(Number(users.get('1')!.mfaLastUsedStep)).toBe(consumedStep);
    expect(challenges.find((c) => c.token === second)!.attempts).toBe(1);
    expect(events.filter((e) => e.type === 'challenge_failed')).toHaveLength(1);
  });

  test('resolves the challenge table and the attempts column from strapi.db.metadata rather than hardcoding them', async () => {
    const { service, challenges, metadataGet } = setup({
      tableName: 'weird_challenge_table',
      attemptsColumn: 'weird_attempts_col',
    });

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, '000000')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });

    expect(metadataGet).toHaveBeenCalledWith(CHALLENGE_UID);
    expect(challenges.find((c) => c.token === token)!.attempts).toBe(1);
  });

  test('a recovery code still works when the stored totp secret cannot be read', async () => {
    // The ENCRYPTION_KEY-rotation case recovery codes exist for. `verifyTotpForUser` throws for an
    // undecryptable secret, and that error's own message tells the user to present a recovery
    // code — so if the throw escaped `verifyChallenge`, the documented escape hatch would be
    // unreachable at the only endpoint that accepts it.
    const { service, challenges, events, recoveryRows, decrypt } = setup({
      unreadableSecret: true,
    });
    const codes = await service.issueRecoveryCodes('1');

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, codes[0])).resolves.toEqual({
      ok: true,
      userId: '1',
    });

    expect(recoveryRows.find((r) => r.codeHash === `h:${codes[0]}`)!.usedAt).toBeInstanceOf(Date);
    expect(challenges.some((c) => c.token === token)).toBe(false);
    expect(events.filter((e) => e.type === 'recovery_code_used')).toHaveLength(1);

    // With the length routing a recovery-shaped code never reaches the TOTP branch at all, so the
    // broken secret is not merely survived, it is never touched.
    expect(decrypt).not.toHaveBeenCalled();
  });

  test('an unreadable totp secret fails the attempt instead of throwing, and still charges both tiers', async () => {
    const { service, strapi, challenges, events, secret } = setup({ unreadableSecret: true });

    const { token } = await service.createChallenge('1');

    // A totp-shaped code does reach the TOTP branch, where the secret read throws. That must be
    // "this code did not match", not an error escaping to the caller: propagating would skip the
    // `challenge_failed` event below, so the per-challenge counter would advance while the
    // account-scoped one never did — leaving an account with a broken secret guessable forever.
    await expect(service.verifyChallenge(token, '000000')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });

    expect(challenges.find((c) => c.token === token)!.attempts).toBe(1);
    expect(events.filter((e) => e.type === 'challenge_failed')).toHaveLength(1);

    // Not swallowed silently: an operator needs to know why TOTP stopped working. And the warning
    // must not carry the thing it is about.
    const warn = strapi.log.warn as jest.Mock;
    expect(warn).toHaveBeenCalled();
    const logged = warn.mock.calls.map((call) => String(call[0])).join(' ');
    expect(logged).toMatch(/recovery code/i);
    expect(logged).not.toContain(base32Encode(secret));
  });

  test('a totp-shaped wrong code costs no bcrypt comparisons', async () => {
    const { service, validatePassword } = setup();
    await service.issueRecoveryCodes('1');
    validatePassword.mockClear();

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, '000000')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });

    // There are ten unused codes sitting in the store, so without dispatching on the code's own
    // length this wrong 6-digit code would bcrypt-compare against every one of them — about a
    // second of CPU, on an unauthenticated endpoint, for every wrong guess.
    expect(validatePassword).not.toHaveBeenCalled();
  });

  test('a recovery-shaped wrong code costs no totp verification', async () => {
    const { service, decrypt, validatePassword } = setup();
    await service.issueRecoveryCodes('1');
    validatePassword.mockClear();

    const { token } = await service.createChallenge('1');
    await expect(service.verifyChallenge(token, 'ZZZZZZZZZZ')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });

    // The two factors have disjoint lengths, so a 10-character code is never a TOTP candidate and
    // the secret is never decrypted for it.
    expect(decrypt).not.toHaveBeenCalled();
    // ...but the recovery branch really did run, so the assertion above is about routing rather
    // than about nothing having happened.
    expect(validatePassword).toHaveBeenCalled();
  });

  test('sweeping removes expired challenges and leaves live ones alone', async () => {
    const { service, challenges } = setup();

    const { token: live } = await service.createChallenge('1');
    const { token: dead } = await service.createChallenge('1');
    challenges.find((c) => c.token === dead)!.expiresAt = new Date(Date.now() - 1000);

    await expect(service.sweepExpiredChallenges()).resolves.toBe(1);
    expect(challenges.map((c) => c.token)).toEqual([live]);

    // Housekeeping only: nothing to do a second time, and it never touches a usable challenge.
    await expect(service.sweepExpiredChallenges()).resolves.toBe(0);
    expect(challenges.map((c) => c.token)).toEqual([live]);
  });
});

describe('mfa service: notices and acknowledgement', () => {
  const setup = () => {
    const fixture = buildMfaFixture();
    const service = createMfaService(defaultDeps(fixture.strapi));
    return { ...fixture, service };
  };

  test("unseenEvents returns only the caller's events that have not been marked seen", async () => {
    const { service, events } = setup();
    await service.recordEvent('1', 'enabled');
    await service.recordEvent('1', 'disabled');
    await service.recordEvent('2', 'enabled');
    // Already seen: must not come back from `unseenEvents`.
    events.find((e) => e.userId === '1' && e.type === 'disabled')!.seenAt = new Date();

    const notices = await service.unseenEvents('1');

    // Mapped to the public shape, not the raw row: no `userId` (redundant -- it is always the
    // caller's own), and `createdAt` serialised to a string.
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ type: 'enabled', seenAt: null });
    expect(notices[0]).not.toHaveProperty('userId');
    expect(typeof notices[0].createdAt).toBe('string');
  });

  test('unseenEvents never returns the recovery_codes_issued acknowledgement marker', async () => {
    const { service } = setup();
    // `issueRecoveryCodes` records a `recovery_codes_issued` marker as a side effect.
    await service.issueRecoveryCodes('1');
    await service.recordEvent('1', 'enabled');

    const notices = await service.unseenEvents('1');

    expect(notices).toHaveLength(1);
    expect(notices[0].type).toBe('enabled');
  });

  test("markEventsSeen with no ids marks every one of the caller's notices, and no one else's, but never the marker", async () => {
    const { service, events } = setup();
    await service.recordEvent('1', 'enabled');
    await service.recordEvent('1', 'challenge_failed');
    await service.issueRecoveryCodes('1'); // a recovery_codes_issued marker for user '1'
    await service.recordEvent('2', 'enabled');

    await service.markEventsSeen('1');

    const callerNotices = events.filter(
      (e) => e.userId === '1' && e.type !== 'recovery_codes_issued'
    );
    expect(callerNotices.every((e) => e.seenAt instanceof Date)).toBe(true);
    expect(
      events.find((e) => e.userId === '1' && e.type === 'recovery_codes_issued')!.seenAt
    ).toBeNull();
    expect(events.find((e) => e.userId === '2')!.seenAt).toBeNull();
  });

  test("markEventsSeen with ids only touches the calling user's rows, even when a foreign id is included", async () => {
    const { service, events } = setup();
    await service.recordEvent('1', 'enabled');
    await service.recordEvent('2', 'enabled');
    const callerEvent = events.find((e) => e.userId === '1')!;
    // An id genuinely belonging to another user, deliberately included in the caller's own
    // request -- the property this test exists to prove is that `userId` is always part of the
    // `where`, so an `ids` array can only ever narrow the caller's own rows, never reach past them.
    const foreignEvent = events.find((e) => e.userId === '2')!;

    await service.markEventsSeen('1', [callerEvent.id, foreignEvent.id]);

    expect(events.find((e) => e.id === callerEvent.id)!.seenAt).toBeInstanceOf(Date);
    expect(events.find((e) => e.id === foreignEvent.id)!.seenAt).toBeNull();
  });

  test('markEventsSeen with only a foreign id touches nothing', async () => {
    const { service, events } = setup();
    await service.recordEvent('2', 'enabled');
    const foreignEvent = events.find((e) => e.userId === '2')!;

    await service.markEventsSeen('1', [foreignEvent.id]);

    expect(events.find((e) => e.id === foreignEvent.id)!.seenAt).toBeNull();
  });

  test("markEventsSeen with the marker row's own id in ids does not acknowledge it", async () => {
    const { service, events } = setup();
    await service.issueRecoveryCodes('1');
    const marker = events.find((e) => e.type === 'recovery_codes_issued')!;

    await service.markEventsSeen('1', [marker.id]);

    expect(events.find((e) => e.id === marker.id)!.seenAt).toBeNull();
    expect(await service.areCodesAcknowledged('1')).toBe(false);
  });

  test('a fresh recovery-code issuance is unacknowledged', async () => {
    const { service } = setup();
    await service.issueRecoveryCodes('1');

    expect(await service.areCodesAcknowledged('1')).toBe(false);
  });

  test('completing enrolment leaves the freshly issued codes unacknowledged, and acknowledging flips it', async () => {
    const { strapi } = buildMfaFixture();
    const service = createMfaService(defaultDeps(strapi));

    const { secret } = await service.beginEnrolment('1', 'pw');
    const code = generateTotp({ secret: base32Decode(secret) });
    await service.completeEnrolment('1', code);

    expect(await service.areCodesAcknowledged('1')).toBe(false);

    await service.acknowledgeCodes('1');

    expect(await service.areCodesAcknowledged('1')).toBe(true);
  });

  test('regenerating issues a fresh marker, so the new codes read as unacknowledged again', async () => {
    const { service } = setup();
    await service.issueRecoveryCodes('1');
    await service.acknowledgeCodes('1');
    expect(await service.areCodesAcknowledged('1')).toBe(true);

    await service.issueRecoveryCodes('1'); // regenerate

    expect(await service.areCodesAcknowledged('1')).toBe(false);
  });

  test("areCodesAcknowledged for one account is unaffected by another account's acknowledgement", async () => {
    const { service } = setup();
    await service.issueRecoveryCodes('1');
    await service.issueRecoveryCodes('2');

    await service.acknowledgeCodes('2');

    expect(await service.areCodesAcknowledged('1')).toBe(false);
    expect(await service.areCodesAcknowledged('2')).toBe(true);
  });

  test('areCodesAcknowledged is false for an account that has never had codes issued', async () => {
    const { service } = setup();

    expect(await service.areCodesAcknowledged('1')).toBe(false);
  });
});

describe('mfa service: assertPasswordAndFactor and disable', () => {
  const CORRECT_PASSWORD = 'correct-password';

  const setup = (options: { unreadableSecret?: boolean } = {}) => {
    const fixture = buildMfaFixture();
    const secret = generateTotpSecret();
    const user = fixture.users.get('1')!;
    user.password = 'hashed-password';
    user.mfaSecret = `enc:${base32Encode(secret)}`;
    user.mfaEnabledAt = new Date();

    const decrypt = jest.fn((v: string) => (options.unreadableSecret ? null : v.slice(4)));
    // Doubles as both the account-password check (`hash === 'hashed-password'`) and
    // `consumeRecoveryCode`'s candidate comparison (`hash === 'h:' + plain`, matching
    // `hashPassword` below) -- `assertPasswordAndFactor` genuinely goes through both paths.
    const validatePassword = jest.fn(
      async (plain: string, hash: string) =>
        (hash === 'hashed-password' && plain === CORRECT_PASSWORD) || hash === `h:${plain}`
    );

    const service = createMfaService({
      strapi: fixture.strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt },
      auth: { validatePassword, hashPassword: async (plain: string) => `h:${plain}` },
    });

    return {
      ...fixture,
      service,
      secret,
      validCode: () => generateTotp({ secret }),
    };
  };

  describe('assertPasswordAndFactor', () => {
    test('rejects a wrong password before evaluating any factor, and records nothing', async () => {
      const { service, events } = setup();

      await expect(
        service.assertPasswordAndFactor('1', 'wrong-password', '123456')
      ).rejects.toThrow(/invalid credentials/i);
      expect(events).toHaveLength(0);
    });

    test('accepts the correct password with a valid totp code', async () => {
      const { service, validCode } = setup();

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, validCode())
      ).resolves.toBeUndefined();
    });

    test('accepts the correct password with a valid recovery code and records its use', async () => {
      const { service, events } = setup();
      const [code] = await service.issueRecoveryCodes('1');

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, code)
      ).resolves.toBeUndefined();
      expect(events.filter((e) => e.type === 'recovery_code_used')).toHaveLength(1);
    });

    test('rejects a wrong code and records a challenge_failed event', async () => {
      const { service, events } = setup();

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, '000000')
      ).rejects.toThrow(/invalid code/i);
      expect(events.filter((e) => e.type === 'challenge_failed')).toHaveLength(1);
    });

    test('a spent totp step cannot be replayed here either', async () => {
      const { service, validCode } = setup();
      const code = validCode();

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, code)
      ).resolves.toBeUndefined();
      await expect(service.assertPasswordAndFactor('1', CORRECT_PASSWORD, code)).rejects.toThrow(
        /invalid code/i
      );
    });

    test('a totp-shaped code against an unreadable secret propagates the actionable error, charging neither tier', async () => {
      const { service, events } = setup({ unreadableSecret: true });

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, '123456')
      ).rejects.toThrow(/could not be read/i);
      // Unlike an ordinary wrong code, this never reaches the record-and-throw fallthrough: the
      // fault is the deployment's (a rotated ENCRYPTION_KEY), not an attacker's guess.
      expect(events).toHaveLength(0);
    });

    test('a recovery code still works when the totp secret is unreadable', async () => {
      const { service, events } = setup({ unreadableSecret: true });
      const [code] = await service.issueRecoveryCodes('1');

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, code)
      ).resolves.toBeUndefined();
      expect(events.filter((e) => e.type === 'recovery_code_used')).toHaveLength(1);
    });

    test('is throttled once the account-wide failure cap is reached, before any code is evaluated', async () => {
      const { service } = setup();
      const cap = MFA_DEFAULTS.maxUserAttempts;

      for (let i = 0; i < cap; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await expect(
          service.assertPasswordAndFactor('1', CORRECT_PASSWORD, '000000')
        ).rejects.toThrow(/invalid code/i);
      }

      await expect(
        service.assertPasswordAndFactor('1', CORRECT_PASSWORD, '000000')
      ).rejects.toBeInstanceOf(errors.RateLimitError);
    });
  });

  describe('disable', () => {
    test('clears the secret, enrolment timestamp and last-used step, and deletes recovery codes and challenges', async () => {
      const { service, users, recoveryRows, challenges } = setup();
      await service.issueRecoveryCodes('1');
      await service.createChallenge('1');

      await service.disable('1');

      const user = users.get('1')!;
      expect(user.mfaSecret).toBeNull();
      expect(user.mfaEnabledAt).toBeNull();
      expect(user.mfaLastUsedStep).toBeNull();
      expect(recoveryRows.filter((r) => r.userId === '1')).toHaveLength(0);
      expect(challenges.filter((c) => c.userId === '1')).toHaveLength(0);
    });

    test("disabling one account leaves another account's recovery codes and challenges alone", async () => {
      const { service, recoveryRows, challenges } = setup();
      await service.issueRecoveryCodes('1');
      await service.createChallenge('1');
      await service.issueRecoveryCodes('2');
      await service.createChallenge('2');

      await service.disable('1');

      expect(recoveryRows.filter((r) => r.userId === '2').length).toBeGreaterThan(0);
      expect(challenges.filter((c) => c.userId === '2')).toHaveLength(1);
    });

    test('a failing user update rolls back the recovery-code and challenge deletes (Finding 1: no permanent lockout)', async () => {
      // The third of `disable`'s three statements is made to reject. Without a transaction the
      // first two (the deletes) would already have committed by the time this throws, leaving
      // the account with `mfaEnabledAt`/`mfaSecret` still set (a code is still demanded) and zero
      // recovery codes -- and `beginEnrolment` refuses to re-enrol while `mfaEnabledAt` is set, so
      // that combination is a permanent lockout with no path back but the CLI reset.
      const { strapi, recoveryRows, challenges } = buildMfaFixture({
        userOverrides: {
          update: jest.fn(async () => {
            throw new Error('connection dropped');
          }),
        },
      });
      const service = createMfaService(defaultDeps(strapi));

      await service.issueRecoveryCodes('1');
      await service.createChallenge('1');
      const codesBefore = recoveryRows.filter((r) => r.userId === '1').length;
      const challengesBefore = challenges.filter((c) => c.userId === '1').length;
      expect(codesBefore).toBeGreaterThan(0);
      expect(challengesBefore).toBeGreaterThan(0);

      await expect(service.disable('1')).rejects.toThrow(/connection dropped/);

      // Rolled back, not merely "not yet deleted": a real transaction undoes the earlier deletes
      // too when the final statement fails.
      expect(recoveryRows.filter((r) => r.userId === '1')).toHaveLength(codesBefore);
      expect(challenges.filter((c) => c.userId === '1')).toHaveLength(challengesBefore);
    });
  });
});
