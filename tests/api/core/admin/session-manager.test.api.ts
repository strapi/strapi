'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createUtils } from 'api-tests/utils';
import jwt from 'jsonwebtoken';

const contentTypeUID = 'admin::session';

describe('SessionManager API Integration', () => {
  let strapi: any;
  let utils: any;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
  });

  afterAll(async () => {
    await strapi.db.query(contentTypeUID).deleteMany({});
    await strapi.destroy();
  });

  describe('SessionManager Service Integration', () => {
    const testUserId = 'test-user-123';
    const testDeviceId = 'test-device-456';
    const testOrigin = 'admin';

    afterEach(async () => {
      await strapi.db.query(contentTypeUID).deleteMany({
        where: { userId: testUserId },
      });
    });

    describe('strapi.sessionManager access', () => {
      it('should be accessible via strapi.sessionManager', () => {
        expect(strapi.sessionManager).toBeDefined();
        expect(typeof strapi.sessionManager.generateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager.generateSessionId).toBe('function');
        expect(typeof strapi.sessionManager.validateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager.generateAccessToken).toBe('function');
      });
    });

    describe('generateRefreshToken', () => {
      it('should create a session in the database', async () => {
        const result = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        expect(result).toMatchObject({
          token: expect.any(String),
          sessionId: expect.any(String),
        });

        // Verify session was created in database
        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: result.sessionId },
        });

        expect(session).toMatchObject({
          userId: testUserId,
          sessionId: result.sessionId,
          deviceId: testDeviceId,
          origin: testOrigin,
          expiresAt: expect.any(String),
        });
      });

      it('should generate a valid JWT token', async () => {
        const result = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        expect(result.token).toBeTruthy();
        expect(typeof result.token).toBe('string');
      });

      it('should include correct claims in the JWT and match DB/sessionId', async () => {
        const result = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const { secret } = strapi.config.get('admin.auth', { secret: '' });
        const decoded = jwt.verify(result.token, secret, { algorithms: ['HS256'] }) as {
          userId: string;
          sessionId: string;
          type: string;
          iat: number;
          exp: number;
        };

        expect(decoded.userId).toBe(testUserId);
        expect(decoded.sessionId).toBe(result.sessionId);
        expect(decoded.type).toBe('refresh');

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: result.sessionId },
        });
        expect(session?.sessionId).toBe(result.sessionId);
      });

      it('should clean up expired sessions before creating new ones', async () => {
        const expiredSessionId = 'expired-session-123';
        await strapi.db.query(contentTypeUID).create({
          data: {
            userId: testUserId,
            sessionId: expiredSessionId,
            deviceId: 'old-device',
            origin: testOrigin,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          },
        });

        // Bump throttling counter so the next call triggers cleanup once
        const manager: any = strapi.sessionManager;
        manager.cleanupInvocationCounter = manager.cleanupEveryCalls - 1;

        await strapi.sessionManager.generateRefreshToken(testUserId, testDeviceId, testOrigin);

        const expiredSessionAfter = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: expiredSessionId },
        });
        expect(expiredSessionAfter).toBeNull();
      });

      it('should clean up all expired sessions for the user', async () => {
        const expiredIds = ['expired-1', 'expired-2', 'expired-3'];
        await Promise.all(
          expiredIds.map((id) =>
            strapi.db.query(contentTypeUID).create({
              data: {
                userId: testUserId,
                sessionId: id,
                deviceId: 'old-device',
                origin: testOrigin,
                expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              },
            })
          )
        );

        // Bump throttling counter so the next call triggers cleanup once
        const manager: any = strapi.sessionManager;
        manager.cleanupInvocationCounter = manager.cleanupEveryCalls - 1;

        await strapi.sessionManager.generateRefreshToken(testUserId, testDeviceId, testOrigin);

        const remainingExpiredAfter = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId, expiresAt: { $lt: new Date() } },
        });
        expect(remainingExpiredAfter).toHaveLength(0);
      });

      it('should allow multiple active sessions for different devices', async () => {
        const device1 = 'device-1';
        const device2 = 'device-2';

        const result1 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          device1,
          testOrigin
        );
        const result2 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          device2,
          testOrigin
        );

        expect(result1.sessionId).not.toBe(result2.sessionId);

        const sessions = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId },
        });

        expect(sessions).toHaveLength(2);
        expect(sessions.map((s) => s.deviceId)).toEqual(expect.arrayContaining([device1, device2]));
      });

      it('should allow multiple active sessions for different origins', async () => {
        const origin1 = 'admin';
        const origin2 = 'users-permissions';

        const result1 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          origin1
        );
        const result2 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          origin2
        );

        expect(result1.sessionId).not.toBe(result2.sessionId);

        const sessions = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId },
        });

        expect(sessions).toHaveLength(2);
        expect(sessions.map((s) => s.origin)).toEqual(expect.arrayContaining([origin1, origin2]));
      });

      it('should set correct expiration time (30 days)', async () => {
        const startTime = Date.now();
        const result = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: result.sessionId },
        });

        const expectedExpiration = startTime + 30 * 24 * 60 * 60 * 1000;
        const actualExpiration = new Date(session.expiresAt).getTime();

        expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1_000);
      });

      it('should have JWT exp aligned with configured TTL and match DB expiresAt', async () => {
        const startTimeSec = Math.floor(Date.now() / 1000);
        const result = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const { secret } = strapi.config.get('admin.auth', { secret: '' });
        const decoded = jwt.verify(result.token, secret, { algorithms: ['HS256'] }) as {
          iat: number;
          exp: number;
        };

        // TTL is 30 days in seconds by default in the provider config
        const ttlSeconds = 30 * 24 * 60 * 60;
        expect(Math.abs(decoded.exp - decoded.iat - ttlSeconds)).toBeLessThan(2);

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: result.sessionId },
        });
        const expMs = decoded.exp * 1000;
        const dbExpiresMs = new Date(session.expiresAt).getTime();
        expect(Math.abs(expMs - dbExpiresMs)).toBeLessThan(1_000);
        expect(decoded.iat).toBeGreaterThanOrEqual(startTimeSec - 2);
      });
    });

    describe('generateSessionId', () => {
      it('should generate unique session IDs', () => {
        const sessionId1 = strapi.sessionManager.generateSessionId();
        const sessionId2 = strapi.sessionManager.generateSessionId();

        expect(sessionId1).toBeTruthy();
        expect(sessionId2).toBeTruthy();
        expect(sessionId1).not.toBe(sessionId2);
        expect(typeof sessionId1).toBe('string');
        expect(typeof sessionId2).toBe('string');
      });

      it('should generate a 32-character lowercase hex session ID', () => {
        const sessionId = strapi.sessionManager.generateSessionId();
        expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
      });
    });

    describe('validateRefreshToken', () => {
      it('should validate a valid refresh token', async () => {
        const tokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const validationResult = await strapi.sessionManager.validateRefreshToken(
          tokenResult.token
        );

        expect(validationResult).toEqual({
          isValid: true,
          userId: testUserId,
          sessionId: tokenResult.sessionId,
        });

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: tokenResult.sessionId },
        });

        expect(session).toBeTruthy();
        expect(session.user).toBe(testUserId);
      });

      it('should reject malformed tokens', async () => {
        const result = await strapi.sessionManager.validateRefreshToken('invalid-jwt-token');

        expect(result).toEqual({
          isValid: false,
        });
      });

      it('should reject token when session not found in database', async () => {
        const tokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        await strapi.db.query(contentTypeUID).delete({
          where: { sessionId: tokenResult.sessionId },
        });

        const result = await strapi.sessionManager.validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });
      });

      it('should reject expired session and clean up database', async () => {
        const tokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        // Update the session to be expired
        const pastDate = new Date(Date.now() - 60 * 60 * 1000); // Expired 1 hour ago

        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: tokenResult.sessionId },
          data: { expiresAt: pastDate },
        });

        const updatedSession = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: tokenResult.sessionId },
        });
        expect(new Date(updatedSession.expiresAt)).toEqual(pastDate);

        const result = await strapi.sessionManager.validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });

        // Verify expired session was cleaned up from database
        const cleanedSession = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: tokenResult.sessionId },
        });
        expect(cleanedSession).toBeNull();
      });

      it('should reject token when user ID mismatch', async () => {
        // Generate token for one user
        const tokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        // Manually modify session in database to have different user
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: tokenResult.sessionId },
          data: { user: 'different-user-id' },
        });

        const result = await strapi.sessionManager.validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });
      });
    });

    describe('generateAccessToken', () => {
      it('should generate access token for valid refresh token', async () => {
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const accessTokenResult = await strapi.sessionManager.generateAccessToken(
          refreshTokenResult.token
        );

        expect(accessTokenResult).toHaveProperty('token');
        expect(accessTokenResult).not.toHaveProperty('error');
        expect(typeof accessTokenResult.token).toBe('string');
      });

      it('should generate access token with correct JWT payload', async () => {
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const accessTokenResult = await strapi.sessionManager.generateAccessToken(
          refreshTokenResult.token
        );

        expect(accessTokenResult).toHaveProperty('token');

        // Verify the JWT payload structure
        const jwt = require('jsonwebtoken');
        const jwtSecret = strapi.config.get('admin.auth.secret');
        const decodedPayload = jwt.verify(accessTokenResult.token, jwtSecret);

        expect(decodedPayload).toMatchObject({
          userId: testUserId,
          sessionId: refreshTokenResult.sessionId,
          type: 'access',
          exp: expect.any(Number),
          iat: expect.any(Number),
        });

        const tokenLifespan = decodedPayload.exp - decodedPayload.iat;
        // Verify access token has shorter lifespan (1 hour = 3600 seconds)
        expect(tokenLifespan).toBe(3600);
      });

      it('should return error for invalid refresh token', async () => {
        const result = await strapi.sessionManager.generateAccessToken('invalid-jwt-token');

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error for expired refresh token', async () => {
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        // Update the session to be expired
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: refreshTokenResult.sessionId },
          data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour ago
        });

        const result = await strapi.sessionManager.generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error when refresh token session not found', async () => {
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        // Delete the session from database
        await strapi.db.query(contentTypeUID).delete({
          where: { sessionId: refreshTokenResult.sessionId },
        });

        const result = await strapi.sessionManager.generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error for access token passed as refresh token', async () => {
        // First generate a refresh token and then an access token
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        const accessTokenResult = await strapi.sessionManager.generateAccessToken(
          refreshTokenResult.token
        );

        // Ensure we got a token, not an error
        expect(accessTokenResult).toHaveProperty('token');

        // Try to use the access token to generate another access token (should fail)
        const result = await strapi.sessionManager.generateAccessToken(
          (accessTokenResult as { token: string }).token
        );

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error when user ID mismatch in session', async () => {
        const refreshTokenResult = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        // Manually modify session in database to have different user
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: refreshTokenResult.sessionId },
          data: { user: 'different-user-id' },
        });

        const result = await strapi.sessionManager.generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should work with multiple valid refresh tokens', async () => {
        const refreshToken1 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          'device-1',
          testOrigin
        );
        const refreshToken2 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          'device-2',
          testOrigin
        );

        const accessToken1 = await strapi.sessionManager.generateAccessToken(refreshToken1.token);
        const accessToken2 = await strapi.sessionManager.generateAccessToken(refreshToken2.token);

        expect(accessToken1).toHaveProperty('token');
        expect(accessToken2).toHaveProperty('token');
        expect(accessToken1.token).not.toBe(accessToken2.token);
      });
    });

    describe('multiple sessions with same device and origin', () => {
      it('should allow multiple active sessions with same deviceId and same origin', async () => {
        const result1 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );
        const result2 = await strapi.sessionManager.generateRefreshToken(
          testUserId,
          testDeviceId,
          testOrigin
        );

        expect(result1.sessionId).not.toBe(result2.sessionId);

        const sessions = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId },
        });

        expect(sessions).toHaveLength(2);
        expect(
          sessions.every((s: any) => s.deviceId === testDeviceId && s.origin === testOrigin)
        ).toBe(true);
      });
    });
  });
});
