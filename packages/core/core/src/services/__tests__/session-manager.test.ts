import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  createSessionManager,
  createDatabaseProvider,
  SessionProvider,
  SessionData,
  SessionManagerConfig,
} from '../session-manager';

jest.mock('crypto');
jest.mock('jsonwebtoken');

const mockCrypto = crypto as jest.Mocked<typeof crypto>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('SessionManager Factory', () => {
  let mockDb: any;
  let mockQuery: any;
  let config: SessionManagerConfig;
  let sessionManager: any;

  beforeEach(() => {
    mockQuery = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    };

    mockDb = {
      query: jest.fn().mockReturnValue(mockQuery),
    };

    config = {
      jwtSecret: 'test-secret',
      refreshTokenLifespan: 30 * 24 * 60 * 60, // 30 days
      accessTokenLifespan: 60 * 60, // 1 hour
    };

    sessionManager = createSessionManager({ db: mockDb, config });

    mockCrypto.randomBytes.mockReturnValue(Buffer.from('abcdef1234567890', 'hex') as any);
    mockJwt.sign.mockReturnValue('test-jwt-token' as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSessionId', () => {
    it('should generate a random session ID', () => {
      const sessionId = sessionManager.generateSessionId();

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(sessionId).toBe('abcdef1234567890');
    });
  });

  describe('generateRefreshToken', () => {
    const userId = 'user123';
    const deviceId = 'device456';
    const origin = 'admin';

    it('should clean up expired sessions first', async () => {
      await sessionManager.generateRefreshToken(userId, deviceId, origin);

      expect(mockQuery.delete).toHaveBeenCalledWith({
        where: { expiresAt: { $lt: expect.any(Date) } },
      });
    });

    it('should create session in database with correct data', async () => {
      mockQuery.create.mockResolvedValue({
        user: userId,
        sessionId: 'abcdef1234567890',
        deviceId,
        origin,
        expiresAt: expect.any(Date),
      });

      await sessionManager.generateRefreshToken(userId, deviceId, origin);

      expect(mockQuery.create).toHaveBeenCalledWith({
        data: {
          user: userId,
          sessionId: 'abcdef1234567890',
          deviceId,
          origin,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should calculate correct expiration date', async () => {
      const startTime = Date.now();

      await sessionManager.generateRefreshToken(userId, deviceId, origin);

      const createCall = mockQuery.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const expectedExpiration = startTime + config.refreshTokenLifespan * 1000;

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(expiresAt - expectedExpiration)).toBeLessThan(1000);
    });

    it('should generate JWT with correct payload', async () => {
      await sessionManager.generateRefreshToken(userId, deviceId, origin);

      const expectedPayload = {
        userId,
        sessionId: 'abcdef1234567890',
        type: 'refresh',
      };

      expect(mockJwt.sign).toHaveBeenCalledWith(expectedPayload, config.jwtSecret, {
        expiresIn: config.refreshTokenLifespan,
      });
    });

    it('should return token and sessionId', async () => {
      const result = await sessionManager.generateRefreshToken(userId, deviceId, origin);

      expect(result).toEqual({
        token: 'test-jwt-token',
        sessionId: 'abcdef1234567890',
      });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockQuery.create.mockRejectedValue(error);

      await expect(sessionManager.generateRefreshToken(userId, deviceId, origin)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('validateRefreshToken', () => {
    const userId = 'user123';
    const sessionId = 'session456';
    const deviceId = 'device789';
    const origin = 'admin';

    beforeEach(() => {
      mockCrypto.randomBytes.mockReturnValue(Buffer.from('abcdef1234567890', 'hex') as any);
      mockJwt.sign.mockReturnValue('test-jwt-token' as any);
    });

    it('should validate a valid refresh token successfully', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      const mockSession = {
        user: userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 hour from now
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockQuery.findOne.mockResolvedValue(mockSession);

      const result = await sessionManager.validateRefreshToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', config.jwtSecret);
      expect(mockQuery.findOne).toHaveBeenCalledWith({ where: { sessionId } });

      expect(result).toEqual({
        isValid: true,
        userId,
        sessionId,
      });
    });

    it('should reject token with wrong type', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'access', // Wrong type
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = await sessionManager.validateRefreshToken('access-token');

      expect(result).toEqual({
        isValid: false,
      });

      expect(mockQuery.findOne).not.toHaveBeenCalled();
    });

    it('should reject token when session not found', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockQuery.findOne.mockResolvedValue(null);

      const result = await sessionManager.validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should reject and clean up expired session', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      const expiredSession = {
        user: userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockQuery.findOne.mockResolvedValue(expiredSession);

      const result = await sessionManager.validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
      expect(mockQuery.delete).toHaveBeenCalledWith({ where: { sessionId } });
    });

    it('should reject token when user ID mismatch', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      const mismatchedSession = {
        user: 'different-user-id',
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 hour from now
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockQuery.findOne.mockResolvedValue(mismatchedSession);

      const result = await sessionManager.validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should handle JWT verification errors', async () => {
      const jwtError = new (jwt as any).JsonWebTokenError('jwt malformed');
      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      const result = await sessionManager.validateRefreshToken('invalid-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should handle JWT token expired errors', async () => {
      // Create a mock error that appears to be a JsonWebTokenError with TokenExpiredError name
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';

      // Make it appear to be an instance of JsonWebTokenError for our error handling
      Object.setPrototypeOf(expiredError, jwt.JsonWebTokenError.prototype);

      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      const result = await sessionManager.validateRefreshToken('expired-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should propagate unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected database error');
      mockQuery.findOne.mockRejectedValue(unexpectedError);

      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      await expect(sessionManager.validateRefreshToken('valid-token')).rejects.toThrow(
        'Unexpected database error'
      );
    });
  });

  describe('createSessionManager factory', () => {
    it('should create session manager with database provider', () => {
      const manager = createSessionManager({ db: mockDb, config });

      expect(manager).toBeDefined();
      expect(typeof manager.generateRefreshToken).toBe('function');
      expect(typeof manager.generateSessionId).toBe('function');
    });
  });
});

describe('DatabaseSessionProvider', () => {
  let mockDb: any;
  let mockQuery: any;
  let provider: SessionProvider;
  const contentType = 'admin::session';

  beforeEach(() => {
    mockQuery = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    };

    mockDb = {
      query: jest.fn().mockReturnValue(mockQuery),
    };

    provider = createDatabaseProvider(mockDb, contentType);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create session and return result', async () => {
      const sessionData: SessionData = {
        user: 'user123',
        sessionId: 'session456',
        deviceId: 'device789',
        origin: 'admin',
        expiresAt: new Date(),
      };

      const expectedResult = { ...sessionData, id: '1' };
      mockQuery.create.mockResolvedValue(expectedResult);

      const result = await provider.create(sessionData);

      expect(mockDb.query).toHaveBeenCalledWith(contentType);
      expect(mockQuery.create).toHaveBeenCalledWith({ data: sessionData });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findBySessionId', () => {
    it('should find session by sessionId', async () => {
      const sessionId = 'session123';
      const expectedResult = {
        id: '1',
        user: 'user123',
        sessionId,
        deviceId: 'device456',
        origin: 'admin',
        expiresAt: new Date(),
      };

      mockQuery.findOne.mockResolvedValue(expectedResult);

      const result = await provider.findBySessionId(sessionId);

      expect(mockQuery.findOne).toHaveBeenCalledWith({ where: { sessionId } });
      expect(result).toEqual(expectedResult);
    });

    it('should return null when session not found', async () => {
      mockQuery.findOne.mockResolvedValue(null);

      const result = await provider.findBySessionId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdentifier', () => {
    it('should find sessions by user identifier', async () => {
      const userId = 'user123';
      const expectedResults = [
        {
          id: '1',
          user: userId,
          sessionId: 'session1',
          deviceId: 'device1',
          origin: 'admin',
          expiresAt: new Date(),
        },
        {
          id: '2',
          user: userId,
          sessionId: 'session2',
          deviceId: 'device2',
          origin: 'admin',
          expiresAt: new Date(),
        },
      ];

      mockQuery.findMany.mockResolvedValue(expectedResults);

      const result = await provider.findByIdentifier(userId);

      expect(mockQuery.findMany).toHaveBeenCalledWith({ where: { user: userId } });
      expect(result).toEqual(expectedResults);
    });
  });

  describe('deleteBySessionId', () => {
    it('should delete session by sessionId', async () => {
      const sessionId = 'session123';

      await provider.deleteBySessionId(sessionId);

      expect(mockQuery.delete).toHaveBeenCalledWith({ where: { sessionId } });
    });
  });

  describe('deleteByIdentifier', () => {
    it('should delete sessions by user identifier', async () => {
      const userId = 'user123';

      await provider.deleteByIdentifier(userId);

      expect(mockQuery.delete).toHaveBeenCalledWith({ where: { user: userId } });
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions', async () => {
      await provider.deleteExpired();

      expect(mockQuery.delete).toHaveBeenCalledWith({
        where: { expiresAt: { $lt: expect.any(Date) } },
      });
    });
  });
});
