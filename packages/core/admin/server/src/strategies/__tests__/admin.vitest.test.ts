import { describe, test, expect, vi } from 'vitest';
/* eslint-disable import/no-relative-packages */
// @ts-expect-error - test purposes
import createContext from '../../../../../../../tests/helpers/create-context';
import adminAuthStrategy from '../admin';

// Vitest counterpart of tests/helpers/create-session-manager-mock (which relies on the `jest` global)
const createMockSessionManager = (originApiOverrides = {}) => {
  const originApi = {
    generateRefreshToken: vi.fn(),
    generateAccessToken: vi.fn(),
    validateAccessToken: vi.fn(),
    validateRefreshToken: vi.fn(),
    rotateRefreshToken: vi.fn(),
    invalidateRefreshToken: vi.fn(),
    isSessionActive: vi.fn(),
    ...originApiOverrides,
  };

  const sessionManager = Object.assign(vi.fn().mockReturnValue(originApi), {
    defineOrigin: vi.fn(),
    hasOrigin: vi.fn(),
    generateSessionId: vi.fn(),
  });

  return { sessionManager, originApi };
};

describe('Admin Auth Strategy', () => {
  describe('Authenticate a user (sessions-based access token)', () => {
    const request = {
      header: {
        authorization: 'Bearer admin_tests-access-token',
      },
    };

    test('Authenticates a valid access token and active session', async () => {
      const validateAccessToken = vi.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = vi.fn(async () => true);
      const ctx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = vi.fn(() => user);
      const generateUserAbility = vi.fn(() => 'ability');

      // Mock the new callable SessionManager API
      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      global.strapi = {
        sessionManager: sessionManager as any,
        admin: {
          services: {
            permission: { engine: { generateUserAbility } },
          },
        },
        db: { query: vi.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(isSessionActive).toHaveBeenCalledWith('session-123');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({
        authenticated: true,
        credentials: user,
        ability: 'ability',
      });
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid authorization header', async () => {
      const ctx = createContext({}, { request: { header: { authorization: 'invalid-header' } } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid bearer token', async () => {
      const validateAccessToken = vi.fn(() => ({ isValid: false, payload: null }));
      const ctx = createContext({}, { request });

      // Mock the new callable SessionManager API
      const { sessionManager } = createMockSessionManager({ validateAccessToken });

      global.strapi = {
        sessionManager: sessionManager as any,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate when session is not active', async () => {
      const validateAccessToken = vi.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = vi.fn(async () => false);
      const ctx = createContext({}, { request });

      // Mock the new callable SessionManager API
      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      global.strapi = {
        sessionManager: sessionManager as any,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(isSessionActive).toHaveBeenCalledWith('session-123');
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid user', async () => {
      const validateAccessToken = vi.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = vi.fn(async () => true);
      const ctx = createContext({}, { request });
      const findOne = vi.fn(() => ({ isActive: false }));

      // Mock the new callable SessionManager API
      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      global.strapi = {
        sessionManager: sessionManager as any,
        db: { query: vi.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate a non-existing user', async () => {
      const validateAccessToken = vi.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = vi.fn(async () => true);
      const ctx = createContext({}, { request });
      const findOne = vi.fn(() => null);

      // Mock the new callable SessionManager API
      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      global.strapi = {
        sessionManager: sessionManager as any,
        db: { query: vi.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });
  });
});
