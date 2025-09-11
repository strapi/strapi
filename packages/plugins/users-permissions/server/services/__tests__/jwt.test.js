'use strict';

const jwtService = require('../jwt');

describe('JWT Service', () => {
  let strapi;
  let service;
  let mockSessionManager;

  beforeEach(() => {
    mockSessionManager = {
      generateRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
      validateAccessToken: jest.fn(),
    };

    strapi = {
      config: {
        get: jest.fn(),
      },
      sessionManager: mockSessionManager,
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
        'users-permissions',
        { familyType: 'refresh' }
      );
      expect(mockSessionManager.generateAccessToken).toHaveBeenCalledWith(
        'refresh-token-123',
        'users-permissions'
      );
      expect(result).toBe('access-token-123');
    });

    it('should handle userId from payload.userId', async () => {
      const payload = { userId: 'user-456' };
      const mockRefreshToken = { token: 'refresh-token-456' };
      const mockAccessToken = { token: 'access-token-456' };

      mockSessionManager.generateRefreshToken.mockResolvedValue(mockRefreshToken);
      mockSessionManager.generateAccessToken.mockResolvedValue(mockAccessToken);

      const result = await service.issue(payload);

      expect(mockSessionManager.generateRefreshToken).toHaveBeenCalledWith(
        'user-456',
        undefined,
        'users-permissions',
        { familyType: 'refresh' }
      );
      expect(result).toBe('access-token-456');
    });

    it('should throw error when no user id provided', async () => {
      const payload = {};

      try {
        await service.issue(payload);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Cannot issue token: missing user id');
      }
    });

    it('should throw error when access token generation fails', async () => {
      const payload = { id: 123 };
      const mockRefreshToken = { token: 'refresh-token-123' };
      const mockAccessTokenError = { error: 'invalid_refresh_token' };

      mockSessionManager.generateRefreshToken.mockResolvedValue(mockRefreshToken);
      mockSessionManager.generateAccessToken.mockResolvedValue(mockAccessTokenError);

      try {
        await service.issue(payload);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Failed to generate access token');
      }
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

      expect(mockSessionManager.validateAccessToken).toHaveBeenCalledWith(
        token,
        'users-permissions'
      );
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
});
