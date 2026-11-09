import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import type { CompatConfig } from '../config';
import {
  CUTOVER_TTL_MS,
  clearLegacyCutoverCache,
  readLegacyCutover,
  resolveLegacyUserId,
  verifyLegacyBearer,
} from '../legacy-jwt';

// Built at run time: a literal secret-shaped string trips secret scanning
const SECRET = randomBytes(32).toString('hex');
const OTHER_SECRET = randomBytes(32).toString('hex');

const NOW = new Date('2026-06-01T12:00:00.000Z');
const UNTIL = new Date('2026-12-31T23:59:59.999Z');
const sec = (date: Date) => Math.floor(date.getTime() / 1000);

const config = (legacyJwt: Partial<CompatConfig['legacyJwt']> = {}): CompatConfig =>
  ({
    legacyJwt: { secret: SECRET, until: UNTIL, algorithm: 'HS256', ...legacyJwt },
  }) as CompatConfig;

// The migration cut over after every token the cases sign
const CUTOVER = new Date('2026-07-01T00:00:00.000Z');
const completed = (cutoverAt: Date = CUTOVER) => ({
  status: 'completed',
  cutoverAt: cutoverAt.toISOString(),
});

const sign = (
  claims: Record<string, unknown>,
  {
    secret = SECRET,
    alg = 'HS256',
    expiresAt = new Date(NOW.getTime() + 60_000),
    issuedAt = NOW as Date | null,
  }: { secret?: string; alg?: string; expiresAt?: Date; issuedAt?: Date | null } = {}
) =>
  jwt.sign(
    { ...claims, ...(issuedAt ? { iat: sec(issuedAt) } : {}), exp: sec(expiresAt) },
    secret,
    { algorithm: alg as jwt.Algorithm, noTimestamp: issuedAt === null }
  );

const strapiWith = ({
  origin = true,
  access = null as null | { userId: string; sessionId: string; type: string; iat?: number },
  active = true,
  user = { documentId: 'user-doc' } as unknown,
  record = completed() as unknown,
} = {}) => {
  const isSessionActive = vi.fn(async () => active);
  const validateAccessToken = vi.fn(() =>
    access ? { isValid: true, payload: access } : { isValid: false, payload: null }
  );
  const sessionManager = Object.assign(
    vi.fn(() => ({ validateAccessToken, isSessionActive })),
    { hasOrigin: vi.fn(() => origin) }
  );
  const findOne = vi.fn(async () => user);
  const query = vi.fn(() => ({ findOne }));
  const get = vi.fn(async () => record);
  const store = vi.fn(() => ({ get }));
  const strapi = { sessionManager, db: { query }, store } as unknown as Core.Strapi;

  return { strapi, isSessionActive, validateAccessToken, findOne, query, get, store };
};

describe('verifyLegacyBearer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies a legacy { id } token and resolves the numeric id to a documentId', async () => {
    const { strapi, findOne, query } = strapiWith();

    const hit = await verifyLegacyBearer(strapi, sign({ id: 7 }), config(), NOW);

    expect(hit).toEqual({ kind: 'legacy', userId: '7' });
    expect(await resolveLegacyUserId(strapi, hit!)).toBe('user-doc');
    expect(query).toHaveBeenCalledWith(USER_UID);
    expect(findOne).toHaveBeenCalledWith({ where: { id: 7 }, select: ['documentId'] });
  });

  it('accepts the id as a string of digits and refuses one that is not a number', async () => {
    const { strapi } = strapiWith();

    expect(await verifyLegacyBearer(strapi, sign({ id: '12' }), config(), NOW)).toEqual({
      kind: 'legacy',
      userId: '12',
    });

    for (const id of ['abc', -1, 1.5, 0, null, {}]) {
      expect(await verifyLegacyBearer(strapi, sign({ id }), config(), NOW)).toBeNull();
    }

    expect(await verifyLegacyBearer(strapi, sign({}), config(), NOW)).toBeNull();
  });

  it('answers null when no user has that numeric id', async () => {
    const { strapi } = strapiWith({ user: null });

    expect(await resolveLegacyUserId(strapi, { kind: 'legacy', userId: '7' })).toBeNull();
  });

  it('refuses a token signed with another secret, an expired one, and one after until', async () => {
    const { strapi } = strapiWith();

    expect(
      await verifyLegacyBearer(strapi, sign({ id: 7 }, { secret: OTHER_SECRET }), config(), NOW)
    ).toBeNull();

    expect(
      await verifyLegacyBearer(
        strapi,
        sign({ id: 7 }, { expiresAt: new Date(NOW.getTime() - 1000) }),
        config(),
        NOW
      )
    ).toBeNull();

    const token = sign({ id: 7 }, { expiresAt: new Date('2027-06-01T00:00:00.000Z') });

    expect(await verifyLegacyBearer(strapi, token, config(), NOW)).not.toBeNull();
    expect(
      await verifyLegacyBearer(strapi, token, config(), new Date(UNTIL.getTime() + 1))
    ).toBeNull();
    expect(await verifyLegacyBearer(strapi, token, config({ until: null }), NOW)).toBeNull();
  });

  it('refuses a token with another algorithm than the configured one, and any token without a secret', async () => {
    const { strapi } = strapiWith();
    const token = sign({ id: 7 }, { alg: 'HS512' });

    expect(await verifyLegacyBearer(strapi, token, config(), NOW)).toBeNull();
    expect(await verifyLegacyBearer(strapi, token, config({ algorithm: 'HS512' }), NOW)).toEqual({
      kind: 'legacy',
      userId: '7',
    });
    expect(await verifyLegacyBearer(strapi, token, config({ secret: null }), NOW)).toBeNull();
    expect(await verifyLegacyBearer(strapi, 'not-a-token', config(), NOW)).toBeNull();
  });

  it('accepts a refresh-mode access token only while its session is active', async () => {
    const access = { userId: '7', sessionId: 'session-1', type: 'access', iat: sec(NOW) };
    const active = strapiWith({ access });

    expect(await verifyLegacyBearer(active.strapi, 'any', config(), NOW)).toEqual({
      kind: 'access',
      userId: '7',
      sessionId: 'session-1',
    });
    expect(active.isSessionActive).toHaveBeenCalledWith('session-1');

    const revoked = strapiWith({ access, active: false });

    expect(await verifyLegacyBearer(revoked.strapi, 'any', config(), NOW)).toBeNull();

    const afterUntil = strapiWith({ access });

    expect(
      await verifyLegacyBearer(afterUntil.strapi, 'any', config(), new Date(UNTIL.getTime() + 1))
    ).toBeNull();
    expect(afterUntil.validateAccessToken).not.toHaveBeenCalled();
  });

  it('refuses a token the origin calls something other than an access token, or a missing origin', async () => {
    const wrongType = strapiWith({
      access: { userId: '7', sessionId: 's', type: 'refresh', iat: sec(NOW) },
    });

    expect(await verifyLegacyBearer(wrongType.strapi, 'any', config(), NOW)).toBeNull();

    const noOrigin = strapiWith({
      origin: false,
      access: { userId: '7', sessionId: 's', type: 'access', iat: sec(NOW) },
    });

    expect(await verifyLegacyBearer(noOrigin.strapi, 'any', config(), NOW)).toBeNull();
  });

  describe('the recorded migration', () => {
    const accessAt = (iat?: number) => ({ userId: '7', sessionId: 's', type: 'access', iat });

    it('refuses both kinds of token with no record, an incomplete one, or one without a cutover', async () => {
      const records = [
        null,
        { status: 'running', cutoverAt: CUTOVER.toISOString() },
        { status: 'completed' },
        { status: 'completed', cutoverAt: 'not a date' },
      ];

      for (const record of records) {
        const idToken = strapiWith({ record });
        const accessToken = strapiWith({ record, access: accessAt(sec(NOW)) });

        expect(await verifyLegacyBearer(idToken.strapi, sign({ id: 7 }), config(), NOW)).toBeNull();
        expect(await verifyLegacyBearer(accessToken.strapi, 'any', config(), NOW)).toBeNull();
        expect(accessToken.isSessionActive).not.toHaveBeenCalled();
      }
    });

    it('accepts a token issued before or at the cutover and refuses one issued after it', async () => {
      const { strapi } = strapiWith();
      const at = (date: Date) => sign({ id: 7 }, { issuedAt: date });
      const cutoverAt = new Date('2026-06-01T12:00:00.500Z');

      // `iat` is whole seconds, so the same second as the cutover counts as before it
      expect(
        await verifyLegacyBearer(strapi, at(new Date('2026-06-01T11:59:59Z')), config(), NOW)
      ).not.toBeNull();

      const equal = strapiWith({ record: completed(cutoverAt) });

      expect(await verifyLegacyBearer(equal.strapi, at(NOW), config(), NOW)).not.toBeNull();
      expect(
        await verifyLegacyBearer(
          equal.strapi,
          at(new Date('2026-06-01T12:00:01Z')),
          config(),
          new Date('2026-06-01T12:00:02Z')
        )
      ).toBeNull();
    });

    it('applies the same cutover to a refresh-mode access token, before it asks about the session', async () => {
      const before = strapiWith({ access: accessAt(sec(CUTOVER) - 1) });
      const equal = strapiWith({ access: accessAt(sec(CUTOVER)) });
      const after = strapiWith({ access: accessAt(sec(CUTOVER) + 1) });

      expect(await verifyLegacyBearer(before.strapi, 'any', config(), NOW)).not.toBeNull();
      expect(await verifyLegacyBearer(equal.strapi, 'any', config(), NOW)).not.toBeNull();
      expect(await verifyLegacyBearer(after.strapi, 'any', config(), NOW)).toBeNull();
      expect(after.isSessionActive).not.toHaveBeenCalled();
    });

    it('refuses a token with no iat, of either kind', async () => {
      const { strapi } = strapiWith({ access: accessAt(undefined) });

      expect(
        await verifyLegacyBearer(strapi, sign({ id: 7 }, { issuedAt: null }), config(), NOW)
      ).toBeNull();

      const access = strapiWith({ access: accessAt(undefined) });

      expect(await verifyLegacyBearer(access.strapi, 'any', config(), NOW)).toBeNull();
    });
  });

  it('refuses an unsigned token, whatever it claims', async () => {
    const { strapi } = strapiWith();
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ id: 7, iat: sec(NOW), exp: sec(UNTIL) })}.`;

    expect(await verifyLegacyBearer(strapi, unsigned, config(), NOW)).toBeNull();
  });

  it('refuses a token that is not valid yet', async () => {
    const { strapi } = strapiWith();
    const token = jwt.sign({ id: 7, iat: sec(NOW), nbf: sec(NOW) + 3600 }, SECRET, {
      algorithm: 'HS256',
      expiresIn: '2h',
    });

    expect(await verifyLegacyBearer(strapi, token, config(), NOW)).toBeNull();
  });

  it('refuses an id beyond what the user table can hold', async () => {
    const { strapi } = strapiWith();

    for (const id of ['2147483648', '9007199254740993', 2147483648, 2 ** 53]) {
      expect(await verifyLegacyBearer(strapi, sign({ id }), config(), NOW)).toBeNull();
    }

    expect(await verifyLegacyBearer(strapi, sign({ id: '2147483647' }), config(), NOW)).toEqual({
      kind: 'legacy',
      userId: '2147483647',
    });
  });
});

describe('readLegacyCutover', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers the cutover of a completed record and null otherwise, and reads the store once a minute', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const { strapi, get, store } = strapiWith();

    expect(await readLegacyCutover(strapi)).toEqual(CUTOVER);
    expect(await readLegacyCutover(strapi)).toEqual(CUTOVER);
    expect(get).toHaveBeenCalledTimes(1);
    expect(store).toHaveBeenCalledWith({ type: 'plugin', name: 'end-users' });
    expect(get).toHaveBeenCalledWith({ key: 'migration' });

    await vi.advanceTimersByTimeAsync(CUTOVER_TTL_MS + 1);
    await readLegacyCutover(strapi);
    expect(get).toHaveBeenCalledTimes(2);

    clearLegacyCutoverCache(strapi);
    await readLegacyCutover(strapi);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('fails closed when the store cannot be read, and tries again on the next call', async () => {
    const { strapi, get } = strapiWith();

    get.mockRejectedValueOnce(new Error('db down'));

    expect(await readLegacyCutover(strapi)).toBeNull();
    expect(await readLegacyCutover(strapi)).toEqual(CUTOVER);
  });
});
