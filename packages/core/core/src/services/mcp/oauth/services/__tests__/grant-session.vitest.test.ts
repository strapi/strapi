import jwt from 'jsonwebtoken';
import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { createGrantSessionService } from '../grant-session';

const SECRET = 'test-mcp-jwt-secret';

const makeSetup = () => {
  const origin = {
    generateRefreshToken: vi.fn(async () => ({ token: 'refresh-1' })),
    generateAccessToken: vi.fn(async () => ({ token: 'access-1' })),
    rotateRefreshToken: vi.fn(async () => ({ token: 'refresh-2' })),
    invalidateRefreshToken: vi.fn(async () => {}),
  };

  const findOne = vi.fn();

  const strapi = {
    sessionManager: vi.fn(() => origin),
    db: { query: vi.fn(() => ({ findOne })) },
    log: { warn: vi.fn(), info: vi.fn() },
  } as unknown as Core.Strapi;

  return { service: createGrantSessionService(strapi, SECRET), origin, findOne, strapi };
};

const signToken = (payload: Record<string, unknown>, secret = SECRET) =>
  jwt.sign(payload, secret, { algorithm: 'HS256' });

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  userId: '7',
  sessionId: 'session-1',
  childId: null,
  deviceId: 'grant-1',
  origin: 'mcp',
  status: 'active',
  metadata: { clientId: 'client-1', scope: 'mcp' },
  ...overrides,
});

describe('grant session service', () => {
  describe('issueGrant', () => {
    test('creates the session with the grant id as deviceId and the grant metadata', async () => {
      const { service, origin } = makeSetup();

      const tokens = await service.issueGrant({
        userId: '7',
        grantId: 'grant-1',
        clientId: 'client-1',
        scope: 'mcp',
        resource: 'http://localhost:1337/mcp',
      });

      expect(origin.generateRefreshToken).toHaveBeenCalledWith('7', 'grant-1', {
        type: 'refresh',
        metadata: { clientId: 'client-1', scope: 'mcp', resource: 'http://localhost:1337/mcp' },
      });
      expect(tokens).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1', scope: 'mcp' });
    });

    test('throws when the access token cannot be generated', async () => {
      const { service, origin } = makeSetup();
      origin.generateAccessToken.mockResolvedValue({ error: 'boom' } as never);

      await expect(
        service.issueGrant({ userId: '7', grantId: 'grant-1', clientId: 'client-1' })
      ).rejects.toThrow('Failed to generate an access token');
    });
  });

  describe('refreshGrant', () => {
    test('rejects garbage, wrongly-typed, and wrongly-signed tokens without touching the db', async () => {
      const { service, findOne } = makeSetup();

      await expect(service.refreshGrant('garbage', 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });
      await expect(
        service.refreshGrant(signToken({ type: 'access', sessionId: 's' }), 'client-1')
      ).resolves.toEqual({ error: 'invalid_grant' });
      await expect(
        service.refreshGrant(
          signToken({ type: 'refresh', sessionId: 's' }, 'other-secret'),
          'client-1'
        )
      ).resolves.toEqual({ error: 'invalid_grant' });
      expect(findOne).not.toHaveBeenCalled();
    });

    test('rejects a token whose session is missing or from another origin', async () => {
      const { service, findOne } = makeSetup();
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      findOne.mockResolvedValue(null);
      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });

      findOne.mockResolvedValue(sessionRow({ origin: 'admin' }));
      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });
    });

    test('revokes the family when the wrong client presents the token', async () => {
      const { service, origin, findOne, strapi } = makeSetup();
      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      await expect(service.refreshGrant(token, 'other-client')).resolves.toEqual({
        error: 'invalid_grant',
      });
      expect(origin.invalidateRefreshToken).toHaveBeenCalledWith('7', 'grant-1');
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('wrong client'));
    });

    test('revokes the family when a rotated token is replayed', async () => {
      const { service, origin, findOne, strapi } = makeSetup();
      findOne.mockResolvedValue(sessionRow({ childId: 'session-2' }));
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });
      expect(origin.invalidateRefreshToken).toHaveBeenCalledWith('7', 'grant-1');
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('replayed'));
    });

    test('rotates the token and issues a fresh access token on the happy path', async () => {
      const { service, origin, findOne } = makeSetup();
      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-2',
        scope: 'mcp',
      });
      expect(origin.rotateRefreshToken).toHaveBeenCalledWith(token);
      expect(origin.invalidateRefreshToken).not.toHaveBeenCalled();
    });

    test('maps rotation and access-token failures to invalid_grant', async () => {
      const { service, origin, findOne } = makeSetup();
      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      origin.rotateRefreshToken.mockResolvedValue({ error: 'boom' } as never);
      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });

      origin.rotateRefreshToken.mockResolvedValue({ token: 'refresh-2' });
      origin.generateAccessToken.mockResolvedValue({ error: 'boom' } as never);
      await expect(service.refreshGrant(token, 'client-1')).resolves.toEqual({
        error: 'invalid_grant',
      });
    });
  });

  describe('revokeToken', () => {
    test('reports false for tokens that resolve to no grant of the client', async () => {
      const { service, origin, findOne } = makeSetup();

      await expect(service.revokeToken('garbage', 'client-1')).resolves.toBe(false);

      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });
      await expect(service.revokeToken(token, 'other-client')).resolves.toBe(false);
      expect(origin.invalidateRefreshToken).not.toHaveBeenCalled();
    });

    test('revokes the family for a refresh token of the right client', async () => {
      const { service, origin, findOne } = makeSetup();
      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'refresh', sessionId: 'session-1' });

      await expect(service.revokeToken(token, 'client-1')).resolves.toBe(true);
      expect(origin.invalidateRefreshToken).toHaveBeenCalledWith('7', 'grant-1');
    });

    test('accepts an access token too (RFC 7009 allows either)', async () => {
      const { service, origin, findOne } = makeSetup();
      findOne.mockResolvedValue(sessionRow());
      const token = signToken({ type: 'access', sessionId: 'session-1' });

      await expect(service.revokeToken(token, 'client-1')).resolves.toBe(true);
      expect(origin.invalidateRefreshToken).toHaveBeenCalledWith('7', 'grant-1');
    });
  });
});
