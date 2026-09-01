import type { Core } from '@strapi/types';
import { generateTotp, base32Decode } from '@strapi/utils';
import createMfaService from '../mfa';

const USER_TABLE = 'admin_users';
const LAST_USED_STEP_COLUMN = 'mfa_last_used_step';

// The service reads/writes the user through two different layers: `strapi.db.query`, which
// speaks JS attribute names (`mfaLastUsedStep`), and the raw `strapi.db.connection`, which
// speaks physical column names (`mfa_last_used_step`). Both must land on the same in-memory
// row for the replay-guard tests to mean anything, so the mock connection translates physical
// column names back to attribute names before touching the row — same as
// `@strapi/database`'s metadata layer does for real.
const COLUMN_TO_ATTRIBUTE: Record<string, string> = {
  [LAST_USED_STEP_COLUMN]: 'mfaLastUsedStep',
};
const resolveKey = (column: string): string => COLUMN_TO_ATTRIBUTE[column] ?? column;

type UserRow = Record<string, unknown>;

/**
 * A knex-shaped `whereNull`/`orWhere` builder that actually evaluates against a row, so the
 * replay-guard tests exercise the real conditional-update semantics rather than a stub that
 * always reports success.
 */
class MockNestedWhereBuilder {
  private predicates: Array<(row: UserRow) => boolean> = [];

  whereNull(column: string) {
    const key = resolveKey(column);
    this.predicates.push((row) => row[key] === null || row[key] === undefined);
    return this;
  }

  orWhere(column: string, operator: string, value: unknown) {
    const key = resolveKey(column);
    this.predicates.push((row) => {
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
    return this;
  }

  test(row: UserRow): boolean {
    // Every condition after the first is joined with OR in this mock, matching the single
    // `whereNull(...).orWhere(...)` chain the replay guard actually issues.
    return this.predicates.some((predicate) => predicate(row));
  }
}

/**
 * Builds a knex-shaped `strapi.db.connection` backed by the same in-memory `users` map as
 * `strapi.db.query`, so a conditional UPDATE really only mutates rows that satisfy every
 * `.where(...)` clause and reports the true affected-row count.
 */
const buildConnection = (users: Map<string, UserRow>) => (tableName: string) => {
  if (tableName !== USER_TABLE) {
    throw new Error(`Unexpected table in mock connection: ${tableName}`);
  }

  const predicates: Array<(row: UserRow) => boolean> = [];

  const builder = {
    where(condition: Record<string, unknown> | ((nested: MockNestedWhereBuilder) => void)) {
      if (typeof condition === 'function') {
        const nested = new MockNestedWhereBuilder();
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

const buildStrapi = (overrides: Record<string, unknown> = {}) => {
  const users = new Map<string, UserRow>();
  users.set('1', {
    id: 1,
    email: 'kai@doe.com',
    password: 'hashed',
    mfaSecret: null,
    mfaEnabledAt: null,
    mfaLastUsedStep: null,
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
        findOne: jest.fn(async ({ where }: any) => users.get(String(where.id)) ?? null),
        update: jest.fn(async ({ where, data }: any) => {
          const user = users.get(String(where.id));
          if (!user) return null;
          Object.assign(user, data);
          return user;
        }),
      })),
      connection: buildConnection(users),
      metadata: {
        get: jest.fn(() => ({
          tableName: USER_TABLE,
          attributes: {
            mfaLastUsedStep: { columnName: LAST_USED_STEP_COLUMN },
          },
        })),
      },
    },
    ...overrides,
  };

  return { strapi, users };
};

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
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => true },
    });

    const result = await service.beginEnrolment('1', 'pw');

    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.otpauthUri).toContain('otpauth://totp/');
    const stored = users.get('1')!;
    expect(String(stored.mfaSecret)).toMatch(/^enc:/);
    expect(stored.mfaEnabledAt).toBeNull();
  });

  test('activates enrolment only after a valid code and records the consumed step', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => true },
    });

    const { secret } = await service.beginEnrolment('1', 'pw');
    const code = generateTotp({ secret: base32Decode(secret) });

    await service.completeEnrolment('1', code);

    const stored = users.get('1')!;
    expect(stored.mfaEnabledAt).toBeInstanceOf(Date);
    expect(Number(stored.mfaLastUsedStep)).toBeGreaterThan(0);
  });

  test('rejects an invalid code and leaves enrolment inactive', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => true },
    });

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

  test('the replay guard rejects a second attempt to consume the same step', async () => {
    const { strapi, users } = buildStrapi();
    const service = createMfaService({
      strapi: strapi as unknown as Core.Strapi,
      encryption: { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.slice(4) },
      auth: { validatePassword: async () => true },
    });

    const step = 123456;
    const first = await service.consumeTotpStep('1', step);
    const second = await service.consumeTotpStep('1', step);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(Number(users.get('1')!.mfaLastUsedStep)).toBe(step);
  });
});
