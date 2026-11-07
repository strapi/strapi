import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import type { CompatConfig } from '../config';
import { resolveLegacyUserId, verifyLegacyBearer } from '../legacy-jwt';

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

const sign = (
  claims: Record<string, unknown>,
  {
    secret = SECRET,
    alg = 'HS256',
    expiresAt = new Date(NOW.getTime() + 60_000),
  }: { secret?: string; alg?: string; expiresAt?: Date } = {}
) =>
  jwt.sign({ ...claims, iat: sec(NOW), exp: sec(expiresAt) }, secret, {
    algorithm: alg as jwt.Algorithm,
  });

const strapiWith = ({
  origin = true,
  access = null as null | { userId: string; sessionId: string; type: string },
  active = true,
  user = { documentId: 'user-doc' } as unknown,
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
  const strapi = { sessionManager, db: { query } } as unknown as Core.Strapi;

  return { strapi, isSessionActive, validateAccessToken, findOne, query };
};

describe('verifyLegacyBearer', () => {
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
    const access = { userId: '7', sessionId: 'session-1', type: 'access' };
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
    const wrongType = strapiWith({ access: { userId: '7', sessionId: 's', type: 'refresh' } });

    expect(await verifyLegacyBearer(wrongType.strapi, 'any', config(), NOW)).toBeNull();

    const noOrigin = strapiWith({
      origin: false,
      access: { userId: '7', sessionId: 's', type: 'access' },
    });

    expect(await verifyLegacyBearer(noOrigin.strapi, 'any', config(), NOW)).toBeNull();
  });
});
