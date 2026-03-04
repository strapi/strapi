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
        expect(typeof strapi.sessionManager.generateSessionId).toBe('function');
        expect(typeof strapi.sessionManager.defineOrigin).toBe('function');
        expect(typeof strapi.sessionManager.hasOrigin).toBe('function');
        expect(typeof strapi.sessionManager('admin')).toBe('object');
        expect(typeof strapi.sessionManager('admin').generateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager('admin').validateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager('admin').generateAccessToken).toBe('function');
        expect(typeof strapi.sessionManager('admin').rotateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager('admin').invalidateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager('admin').isSessionActive).toBe('function');
      });
    });

    describe('generateRefreshToken', () => {
      it('should create a session in the database', async () => {
        const result = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

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
        const result = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        expect(result.token).toBeTruthy();
        expect(typeof result.token).toBe('string');
      });

      it('should include correct claims in the JWT and match DB/sessionId', async () => {
        const result = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

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

      it('should clean up families past absolute expiration before creating new ones', async () => {
        const expiredSessionId = 'expired-session-absolute-123';
        await strapi.db.query(contentTypeUID).create({
          data: {
            userId: testUserId,
            sessionId: expiredSessionId,
            deviceId: 'old-device',
            origin: testOrigin,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            absoluteExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        });

        // Trigger cleanup by performing enough calls to reach the threshold
        const threshold = strapi.sessionManager.cleanupThreshold;
        for (let i = 0; i < threshold; i += 1) {
          await strapi.sessionManager('admin').generateRefreshToken(testUserId, testDeviceId);
        }

        const after = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: expiredSessionId },
        });
        expect(after).toBeNull();
      });

      it('should clean up all families with absolute expiration in the past', async () => {
        const expiredIds = ['fam-exp-1', 'fam-exp-2', 'fam-exp-3'];
        await Promise.all(
          expiredIds.map((id) =>
            strapi.db.query(contentTypeUID).create({
              data: {
                userId: testUserId,
                sessionId: id,
                deviceId: 'old-device',
                origin: testOrigin,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                absoluteExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              },
            })
          )
        );

        // Trigger cleanup by performing enough calls to reach the threshold
        const threshold = strapi.sessionManager.cleanupThreshold;
        for (let i = 0; i < threshold; i += 1) {
          await strapi.sessionManager('admin').generateRefreshToken(testUserId, testDeviceId);
        }

        const remaining = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId, absoluteExpiresAt: { $lt: new Date() } },
        });
        expect(remaining).toHaveLength(0);
      });

      it('should allow multiple active sessions for different devices', async () => {
        const device1 = 'device-1';
        const device2 = 'device-2';

        const result1 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, device1);
        const result2 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, device2);

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

        const result1 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);
        const result2 = await strapi
          .sessionManager('users-permissions')
          .generateRefreshToken(testUserId, testDeviceId);

        expect(result1.sessionId).not.toBe(result2.sessionId);

        const sessions = await strapi.db.query(contentTypeUID).findMany({
          where: { userId: testUserId },
        });

        expect(sessions).toHaveLength(2);
        expect(sessions.map((s) => s.origin)).toEqual(expect.arrayContaining([origin1, origin2]));
      });

      it('should set refresh idle expiration (default 14 days) for refresh family', async () => {
        const startTime = Date.now();
        const result = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: result.sessionId },
        });

        const expectedExpiration = startTime + 14 * 24 * 60 * 60 * 1000;
        const actualExpiration = new Date(session.expiresAt).getTime();

        expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1_000);
      });

      it.skip('should have JWT exp aligned with idle lifespan and match DB expiresAt', async () => {
        const startTimeSec = Math.floor(Date.now() / 1000);
        const result = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const { secret } = strapi.config.get('admin.auth', { secret: '' });
        const decoded = jwt.verify(result.token, secret, { algorithms: ['HS256'] }) as {
          iat: number;
          exp: number;
        };

        const ttlSeconds = 7 * 24 * 60 * 60;
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
        const tokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const validationResult = await strapi
          .sessionManager('admin')
          .validateRefreshToken(tokenResult.token);

        expect(validationResult).toEqual({
          isValid: true,
          userId: testUserId,
          sessionId: tokenResult.sessionId,
        });

        const session = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: tokenResult.sessionId },
        });

        expect(session).toBeTruthy();
        expect(session.userId).toBe(testUserId);
      });

      it('should reject malformed tokens', async () => {
        const result = await strapi
          .sessionManager('admin')
          .validateRefreshToken('invalid-jwt-token');

        expect(result).toEqual({
          isValid: false,
        });
      });

      it('should reject token when session not found in database', async () => {
        const tokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        await strapi.db.query(contentTypeUID).delete({
          where: { sessionId: tokenResult.sessionId },
        });

        const result = await strapi.sessionManager('admin').validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });
      });

      it('should reject expired session', async () => {
        const tokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

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

        const result = await strapi.sessionManager('admin').validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });
      });

      it('should reject token when user ID mismatch', async () => {
        // Generate token for one user
        const tokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Manually modify session in database to have different user
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: tokenResult.sessionId },
          data: { userId: 'different-user-id' },
        });

        const result = await strapi.sessionManager('admin').validateRefreshToken(tokenResult.token);

        expect(result).toEqual({
          isValid: false,
        });
      });
    });

    describe('generateAccessToken', () => {
      it('should rotate refresh token and return same child on reuse', async () => {
        const { token: parentToken } = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // First rotation
        const r1 = await strapi.sessionManager('admin').rotateRefreshToken(parentToken);
        expect('token' in r1).toBe(true);
        if ('token' in r1) {
          const childToken1 = r1.token;
          const childSession1 = r1.sessionId;

          // Second rotation with the same parent should return the same child
          const r2 = await strapi.sessionManager('admin').rotateRefreshToken(parentToken);
          expect('token' in r2).toBe(true);
          if ('token' in r2) {
            expect(r2.sessionId).toBe(childSession1);
            expect(r2.token).toBe(childToken1);
          }
        }
      });

      it('should generate access token for valid refresh token', async () => {
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const accessTokenResult = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

        expect(accessTokenResult).toHaveProperty('token');
        expect(accessTokenResult).not.toHaveProperty('error');
        expect(typeof accessTokenResult.token).toBe('string');
      });

      it('should generate access token with correct JWT payload', async () => {
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const accessTokenResult = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

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
      });

      it('should return error for invalid refresh token', async () => {
        const result = await strapi
          .sessionManager('admin')
          .generateAccessToken('invalid-jwt-token');

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error for expired refresh token', async () => {
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Update the session to be expired
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: refreshTokenResult.sessionId },
          data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour ago
        });

        const result = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error when refresh token session not found', async () => {
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Delete the session from database
        await strapi.db.query(contentTypeUID).delete({
          where: { sessionId: refreshTokenResult.sessionId },
        });

        const result = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error for access token passed as refresh token', async () => {
        // First generate a refresh token and then an access token
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const accessTokenResult = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

        // Ensure we got a token, not an error
        expect(accessTokenResult).toHaveProperty('token');

        // Try to use the access token to generate another access token (should fail)
        const result = await strapi
          .sessionManager('admin')
          .generateAccessToken((accessTokenResult as { token: string }).token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should return error when user ID mismatch in session', async () => {
        const refreshTokenResult = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Manually modify session in database to have different user
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: refreshTokenResult.sessionId },
          data: { userId: 'different-user-id' },
        });

        const result = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshTokenResult.token);

        expect(result).toEqual({
          error: 'invalid_refresh_token',
        });
      });

      it('should work with multiple valid refresh tokens', async () => {
        const refreshToken1 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, 'device-1');
        const refreshToken2 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, 'device-2');

        const accessToken1 = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshToken1.token);
        const accessToken2 = await strapi
          .sessionManager('admin')
          .generateAccessToken(refreshToken2.token);

        expect(accessToken1).toHaveProperty('token');
        expect(accessToken2).toHaveProperty('token');
        expect(accessToken1.token).not.toBe(accessToken2.token);
      });
    });

    describe('rotateRefreshToken', () => {
      it('enforces idle window (returns idle_window_elapsed)', async () => {
        const r = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Make createdAt older than idleRefreshTokenLifespan (14d) by 1 minute
        const past = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000 + 60 * 1000));
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: r.sessionId },
          data: { createdAt: past },
        });

        const rotation = await strapi.sessionManager('admin').rotateRefreshToken(r.token);
        expect(rotation).toEqual({ error: 'idle_window_elapsed' });
      });

      it('enforces max family window (returns max_window_elapsed)', async () => {
        const r = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        // Force absoluteExpiresAt in the past
        await strapi.db.query(contentTypeUID).update({
          where: { sessionId: r.sessionId },
          data: { absoluteExpiresAt: new Date(Date.now() - 1000) },
        });

        const rotation = await strapi.sessionManager('admin').rotateRefreshToken(r.token);
        expect(rotation).toEqual({ error: 'max_window_elapsed' });
      });

      it('marks parent as rotated and sets childId', async () => {
        const r = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

        const rotation = await strapi.sessionManager('admin').rotateRefreshToken(r.token);
        expect('token' in rotation).toBe(true);
        if ('token' in rotation) {
          const parent = await strapi.db.query(contentTypeUID).findOne({
            where: { sessionId: r.sessionId },
          });
          expect(parent?.status).toBe('rotated');
          expect(parent?.childId).toBe(rotation.sessionId);
        }
      });
    });

    describe('multiple sessions with same device and origin', () => {
      it('should allow multiple active sessions with same deviceId and same origin', async () => {
        const result1 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);
        const result2 = await strapi
          .sessionManager('admin')
          .generateRefreshToken(testUserId, testDeviceId);

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
