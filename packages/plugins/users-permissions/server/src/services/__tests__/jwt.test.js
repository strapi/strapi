'use strict';

/* eslint-env jest */

const jwt = require('jsonwebtoken');
const jwtService = require('../jwt');
const {
  createMockSessionManager,
} = require('../../../../../../../tests/helpers/create-session-manager-mock');

describe('JWT Service', () => {
  let strapi;
  let service;
  let mockSessionManager;
  let sessionManagerCallable;

  beforeEach(() => {
    ({ sessionManager: sessionManagerCallable, originApi: mockSessionManager } =
      createMockSessionManager({
        // Only override methods used in this test suite
        generateRefreshToken: jest.fn(),
        generateAccessToken: jest.fn(),
        validateAccessToken: jest.fn(),
      }));

    strapi = {
      config: {
        get: jest.fn(),
      },
      sessionManager: sessionManagerCallable,
      db: {
        query: jest.fn(),
      },
    };

    service = jwtService({ strapi });
  });

  describe('issue method for refresh mode', () => {
    beforeEach(() => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'refresh';
        }
        return defaultValue;
      });
    });

    it('should generate refresh token without deviceId', async () => {
      const payload = { id: 123 };
      const mockRefreshToken = { token: 'refresh-token-123' };
      const mockAccessToken = { token: 'access-token-123' };

      mockSessionManager.generateRefreshToken.mockResolvedValue(mockRefreshToken);
      mockSessionManager.generateAccessToken.mockResolvedValue(mockAccessToken);

      const result = await service.issue(payload);

      expect(mockSessionManager.generateRefreshToken).toHaveBeenCalledWith(
        '123',
        undefined, // deviceId should be undefined
        { type: 'refresh' }
      );
      expect(mockSessionManager.generateAccessToken).toHaveBeenCalledWith('refresh-token-123');
      expect(result).toBe('access-token-123');
    });

    it('should handle userId from payload.userId', async () => {
      const payload = { userId: 'user-456' };
      const mockRefreshToken = { token: 'refresh-token-456' };
      const mockAccessToken = { token: 'access-token-456' };

      mockSessionManager.generateRefreshToken.mockResolvedValue(mockRefreshToken);
      mockSessionManager.generateAccessToken.mockResolvedValue(mockAccessToken);

      const result = await service.issue(payload);

      expect(mockSessionManager.generateRefreshToken).toHaveBeenCalledWith('user-456', undefined, {
        type: 'refresh',
      });
      expect(result).toBe('access-token-456');
    });

    it('should throw error when no user id provided', () => {
      const payload = {};

      expect(() => service.issue(payload)).toThrow('Cannot issue token: missing user id');
    });

    it('should throw error when access token generation fails', async () => {
      const payload = { id: 123 };
      const mockRefreshToken = { token: 'refresh-token-123' };
      const mockAccessTokenError = { error: 'invalid_refresh_token' };

      mockSessionManager.generateRefreshToken.mockResolvedValue(mockRefreshToken);
      mockSessionManager.generateAccessToken.mockResolvedValue(mockAccessTokenError);

      await expect(service.issue(payload)).rejects.toThrow('Failed to generate access token');
    });
  });

  describe('verify method for refresh mode', () => {
    beforeEach(() => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'refresh';
        }
        return defaultValue;
      });

      strapi.db.query.mockReturnValue({
        findOne: jest.fn(),
      });
    });

    it('should validate access token and return user', async () => {
      const token = 'valid-access-token';
      const mockValidationResult = {
        isValid: true,
        payload: { userId: '123', type: 'access' },
      };
      const mockUser = { id: 123, username: 'testuser' };

      mockSessionManager.validateAccessToken.mockReturnValue(mockValidationResult);
      strapi.db.query().findOne.mockResolvedValue(mockUser);

      const result = await service.verify(token);

      expect(mockSessionManager.validateAccessToken).toHaveBeenCalledWith(token);
      expect(strapi.db.query).toHaveBeenCalledWith('plugin::users-permissions.user');
      expect(strapi.db.query().findOne).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(result).toEqual({ id: 123 });
    });

    it('should handle string user ID from token', async () => {
      const token = 'valid-access-token';
      const mockValidationResult = {
        isValid: true,
        payload: { userId: 'string-id', type: 'access' },
      };
      const mockUser = { id: 'string-id', username: 'testuser' };

      mockSessionManager.validateAccessToken.mockReturnValue(mockValidationResult);
      strapi.db.query().findOne.mockResolvedValue(mockUser);

      const result = await service.verify(token);

      expect(strapi.db.query().findOne).toHaveBeenCalledWith({
        where: { id: 'string-id' },
      });
      expect(result).toEqual({ id: 'string-id' });
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      const mockValidationResult = {
        isValid: false,
      };

      mockSessionManager.validateAccessToken.mockReturnValue(mockValidationResult);

      await expect(service.verify(token)).rejects.toThrow('Invalid token.');
    });

    it('should throw error for wrong token type', async () => {
      const token = 'refresh-token';
      const mockValidationResult = {
        isValid: true,
        payload: { userId: '123', type: 'refresh' },
      };

      mockSessionManager.validateAccessToken.mockReturnValue(mockValidationResult);

      await expect(service.verify(token)).rejects.toThrow('Invalid token.');
    });

    it('should throw error when user not found', async () => {
      const token = 'valid-access-token';
      const mockValidationResult = {
        isValid: true,
        payload: { userId: '123', type: 'access' },
      };

      mockSessionManager.validateAccessToken.mockReturnValue(mockValidationResult);
      strapi.db.query().findOne.mockResolvedValue(null);

      await expect(service.verify(token)).rejects.toThrow('Invalid token.');
    });
  });

  describe('verify method for legacy-support mode (issue #26587)', () => {
    const secret = 'legacy-jwt-secret';

    beforeEach(() => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'legacy-support';
        }
        if (path === 'plugin::users-permissions.jwtSecret') {
          return secret;
        }
        if (path === 'plugin::users-permissions.jwt') {
          return {};
        }
        return defaultValue;
      });
    });

    it('accepts HS256 tokens (expected default)', async () => {
      const token = jwt.sign({ id: 1 }, secret, { algorithm: 'HS256' });
      await expect(service.verify(token)).resolves.toMatchObject({ id: 1 });
    });

    it('rejects HS384 and HS512 tokens when no algorithm is configured', async () => {
      const hs384 = jwt.sign({ id: 2 }, secret, { algorithm: 'HS384' });
      const hs512 = jwt.sign({ id: 3 }, secret, { algorithm: 'HS512' });

      await expect(service.verify(hs384)).rejects.toThrow('Invalid token.');
      await expect(service.verify(hs512)).rejects.toThrow('Invalid token.');
    });

    it('rejects unexpected algorithms once algorithm is configured', async () => {
      strapi.config.get.mockImplementation((path, defaultValue) => {
        if (path === 'plugin::users-permissions.jwtManagement') {
          return 'legacy-support';
        }
        if (path === 'plugin::users-permissions.jwtSecret') {
          return secret;
        }
        if (path === 'plugin::users-permissions.jwt') {
          return { algorithm: 'HS256' };
        }
        return defaultValue;
      });

      const hs384 = jwt.sign({ id: 4 }, secret, { algorithm: 'HS384' });
      await expect(service.verify(hs384)).rejects.toThrow('Invalid token.');
    });
  });
});
