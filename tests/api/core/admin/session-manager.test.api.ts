'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createUtils } from 'api-tests/utils';

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
        where: { user: testUserId },
      });
    });

    describe('strapi.sessionManager access', () => {
      it('should be accessible via strapi.sessionManager', () => {
        expect(strapi.sessionManager).toBeDefined();
        expect(typeof strapi.sessionManager.generateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager.generateSessionId).toBe('function');
        expect(typeof strapi.sessionManager.validateRefreshToken).toBe('function');
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
          user: testUserId,
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

      it('should clean up expired sessions before creating new ones', async () => {
        const expiredSessionId = 'expired-session-123';
        await strapi.db.query(contentTypeUID).create({
          data: {
            user: testUserId,
            sessionId: expiredSessionId,
            deviceId: 'old-device',
            origin: testOrigin,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          },
        });

        // Generate new refresh token (should clean up expired one)
        await strapi.sessionManager.generateRefreshToken(testUserId, testDeviceId, testOrigin);

        const expiredSession = await strapi.db.query(contentTypeUID).findOne({
          where: { sessionId: expiredSessionId },
        });
        expect(expiredSession).toBeNull();
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
          where: { user: testUserId },
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
          where: { user: testUserId },
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
  });
});
