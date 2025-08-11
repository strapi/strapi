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
        where: { user: testUserId },
      });
    });

    describe('strapi.sessionManager access', () => {
      it('should be accessible via strapi.sessionManager', () => {
        expect(strapi.sessionManager).toBeDefined();
        expect(typeof strapi.sessionManager.generateRefreshToken).toBe('function');
        expect(typeof strapi.sessionManager.generateSessionId).toBe('function');
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

      it('should clean up all expired sessions for the user', async () => {
        const expiredIds = ['expired-1', 'expired-2', 'expired-3'];
        await Promise.all(
          expiredIds.map((id) =>
            strapi.db.query(contentTypeUID).create({
              data: {
                user: testUserId,
                sessionId: id,
                deviceId: 'old-device',
                origin: testOrigin,
                expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              },
            })
          )
        );

        await strapi.sessionManager.generateRefreshToken(testUserId, testDeviceId, testOrigin);

        const remainingExpired = await strapi.db.query(contentTypeUID).findMany({
          where: { user: testUserId, expiresAt: { $lt: new Date() } },
        });
        expect(remainingExpired).toHaveLength(0);
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
          where: { user: testUserId },
        });

        expect(sessions).toHaveLength(2);
        expect(
          sessions.every((s: any) => s.deviceId === testDeviceId && s.origin === testOrigin)
        ).toBe(true);
      });
    });
  });
});
