import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  createSessionManager,
  createDatabaseProvider,
  SessionProvider,
  SessionData,
  SessionManagerConfig,
} from '../session-manager';
import { DEFAULT_ALGORITHM } from '../../constants';

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
      create: jest.fn((data: SessionData) => {
        return {
          ...data,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + config.idleRefreshTokenLifespan * 1000),
        };
      }),
      findOne: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockDb = {
      query: jest.fn().mockReturnValue(mockQuery),
    };

    config = {
      jwtSecret: 'test-secret',
      accessTokenLifespan: 60 * 60,
      maxRefreshTokenLifespan: 30 * 24 * 60 * 60, // 30 days
      idleRefreshTokenLifespan: 7 * 24 * 60 * 60, // 7 days
      maxSessionLifespan: 7 * 24 * 60 * 60, // 7 days
      idleSessionLifespan: 60 * 60, // 1 hour
    } as SessionManagerConfig;

    sessionManager = createSessionManager({ db: mockDb });
    sessionManager.defineOrigin('admin', config);

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

    it('should periodically clean up expired sessions', async () => {
      // First 49 calls should not trigger cleanup
      for (let i = 0; i < 49; i += 1) {
        await sessionManager('admin').generateRefreshToken(userId, deviceId);
      }

      expect(mockQuery.deleteMany).not.toHaveBeenCalledWith({
        where: { absoluteExpiresAt: { $lt: expect.any(Date) } },
      });

      // 50th call should trigger cleanup asynchronously
      await sessionManager('admin').generateRefreshToken(userId, deviceId);

      // allow the promise to run
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
        where: { absoluteExpiresAt: { $lt: expect.any(Date) } },
      });
    });

    it('should create session in database with correct data', async () => {
      mockQuery.create.mockResolvedValue({
        userId,
        sessionId: 'abcdef1234567890',
        deviceId,
        origin,
        expiresAt: expect.any(Date),
        createdAt: new Date(),
      });

      await sessionManager('admin').generateRefreshToken(userId, deviceId);

      expect(mockQuery.create).toHaveBeenCalledWith({
        data: {
          userId,
          sessionId: 'abcdef1234567890',
          deviceId,
          origin,
          childId: null,
          type: 'refresh',
          status: 'active',
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
        },
      });
    });

    it('should calculate correct expiration date', async () => {
      const startTime = Date.now();

      await sessionManager('admin').generateRefreshToken(userId, deviceId);

      const createCall = mockQuery.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const expectedExpiration = startTime + config.idleRefreshTokenLifespan * 1000;

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(expiresAt - expectedExpiration)).toBeLessThan(1000);
    });

    it('should generate JWT with correct payload', async () => {
      mockQuery.create.mockResolvedValue({
        userId,
        sessionId: 'abcdef1234567890',
        deviceId,
        origin,
        createdAt: new Date(1_700_000_000_000),
        expiresAt: new Date(1_700_000_000_000 + config.idleRefreshTokenLifespan * 1000),
      });

      await sessionManager('admin').generateRefreshToken(userId, deviceId);

      const expectedPayload = expect.objectContaining({
        userId,
        sessionId: 'abcdef1234567890',
        type: 'refresh',
        iat: expect.any(Number),
        exp: expect.any(Number),
      });

      expect(mockJwt.sign).toHaveBeenCalledWith(expectedPayload, config.jwtSecret, {
        algorithm: DEFAULT_ALGORITHM,
        noTimestamp: true,
      });
    });

    it('should return token and sessionId', async () => {
      mockQuery.create.mockResolvedValue({
        userId,
        sessionId: 'abcdef1234567890',
        deviceId,
        origin,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + config.idleRefreshTokenLifespan * 1000),
        absoluteExpiresAt: new Date(Date.now() + config.maxRefreshTokenLifespan * 1000),
      });

      const result = await sessionManager('admin').generateRefreshToken(userId, deviceId);

      expect(result).toEqual({
        token: 'test-jwt-token',
        sessionId: 'abcdef1234567890',
        absoluteExpiresAt: expect.any(String),
      });
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockQuery.create.mockRejectedValue(error);

      await expect(sessionManager('admin').generateRefreshToken(userId, deviceId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should create session without deviceId when undefined', async () => {
      mockQuery.create.mockResolvedValue({
        userId,
        sessionId: 'abcdef1234567890',
        origin,
        expiresAt: expect.any(Date),
        createdAt: new Date(),
      });

      await sessionManager('admin').generateRefreshToken(userId, undefined);

      expect(mockQuery.create).toHaveBeenCalledWith({
        data: {
          userId,
          sessionId: 'abcdef1234567890',
          origin,
          childId: null,
          type: 'refresh',
          status: 'active',
          expiresAt: expect.any(Date),
          absoluteExpiresAt: expect.any(Date),
        },
      });

      // Verify deviceId is not included when undefined
      const createCall = mockQuery.create.mock.calls[0][0];
      expect(createCall.data.deviceId).toBeUndefined();
    });
  });

  describe('validateAccessToken', () => {
    const userId = 'user123';
    const sessionId = 'abcdef1234567890';

    beforeEach(() => {
      mockCrypto.randomBytes.mockReturnValue(Buffer.from(sessionId, 'hex') as any);
    });

    it('returns valid with payload for a correct access token', () => {
      const payload = {
        userId,
        sessionId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwt.verify.mockReturnValue(payload as any);

      const result = sessionManager('admin').validateAccessToken('access.jwt');

      expect(mockJwt.verify).toHaveBeenCalledWith('access.jwt', config.jwtSecret, {
        algorithms: [DEFAULT_ALGORITHM],
      });
      expect(result).toEqual({ isValid: true, payload });
    });

    it('returns invalid when jwt.verify throws TokenExpiredError', () => {
      // Emulate jsonwebtoken TokenExpiredError by throwing any error
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = sessionManager('admin').validateAccessToken('expired.jwt');

      expect(result).toEqual({ isValid: false, payload: null });
    });

    it('returns invalid when token type is not access', () => {
      const refreshPayload = {
        userId,
        sessionId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      mockJwt.verify.mockReturnValue(refreshPayload as any);

      const result = sessionManager('admin').validateAccessToken('refresh.jwt');

      expect(result).toEqual({ isValid: false, payload: null });
    });

    it('returns invalid when jwt.verify throws with invalid signature', () => {
      const error = new Error('invalid signature');
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = sessionManager('admin').validateAccessToken('bad.jwt');

      expect(result).toEqual({ isValid: false, payload: null });
    });
  });

  describe('isSessionActive', () => {
    const userId = 'user-abc';
    const sessionId = 'abcdef1234567890abcdef1234567890';
    const deviceId = 'device-xyz';
    const origin = 'admin';

    beforeEach(() => {
      sessionManager = createSessionManager({ db: mockDb });
      sessionManager.defineOrigin('admin', config);
    });

    it('returns false when session does not exist', async () => {
      mockQuery.findOne.mockResolvedValue(null);

      const result = await sessionManager('admin').isSessionActive(sessionId);

      expect(mockDb.query).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('returns false and deletes when session is expired', async () => {
      const expired = new Date(Date.now() - 1000);
      mockQuery.findOne.mockResolvedValue({
        userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: expired,
      });
      mockQuery.delete.mockResolvedValue(undefined);

      const result = await sessionManager('admin').isSessionActive(sessionId);

      expect(result).toBe(false);
      expect(mockQuery.delete).toHaveBeenCalledWith({ where: { sessionId } });
    });

    it('returns true when session exists and is not expired', async () => {
      const future = new Date(Date.now() + 60 * 1000);
      mockQuery.findOne.mockResolvedValue({
        userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: future,
      });

      const result = await sessionManager('admin').isSessionActive(sessionId);

      expect(result).toBe(true);
      expect(mockQuery.delete).not.toHaveBeenCalled();
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

    it('should validate a valid refresh token successfully (active session)', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      const mockSession = {
        userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      };

      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockQuery.findOne.mockResolvedValue(mockSession);

      const result = await sessionManager('admin').validateRefreshToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', config.jwtSecret, {
        algorithms: [DEFAULT_ALGORITHM],
      });
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

      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = await sessionManager('admin').validateRefreshToken('access-token');

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

      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockQuery.findOne.mockResolvedValue(null);

      const result = await sessionManager('admin').validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should reject expired session', async () => {
      const mockPayload = {
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      const expiredSession = {
        userId,
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockQuery.findOne.mockResolvedValue(expiredSession);

      const result = await sessionManager('admin').validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
      // validateRefreshToken should not delete; cleanup is handled by other paths
      expect(mockQuery.delete).not.toHaveBeenCalled();
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
        userId: 'different-user-id',
        sessionId,
        deviceId,
        origin,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
      };

      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockQuery.findOne.mockResolvedValue(mismatchedSession);

      const result = await sessionManager('admin').validateRefreshToken('valid-token');

      expect(result).toEqual({
        isValid: false,
      });
    });

    it('should handle JWT verification errors', async () => {
      const jwtError = new (jwt as any).JsonWebTokenError('jwt malformed');
      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      const result = await sessionManager('admin').validateRefreshToken('invalid-token');

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

      const sessionId = 'session456';
      const userId = 'user123';

      // First call throws TokenExpiredError
      mockJwt.verify.mockImplementationOnce(() => {
        throw expiredError;
      });

      // Second call ignores expiration and returns payload for cleanup
      mockJwt.verify.mockImplementationOnce(() => {
        return {
          userId,
          sessionId,
          type: 'refresh',
          exp: Math.floor(Date.now() / 1000) - 10,
          iat: Math.floor(Date.now() / 1000) - 20,
        } as any;
      });

      const result = await sessionManager('admin').validateRefreshToken('expired-token');

      expect(result).toEqual({ isValid: false });
      // No DB deletion for JWT errors on validate path
      expect(mockQuery.delete).not.toHaveBeenCalled();
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

      mockJwt.verify.mockReturnValue(mockPayload as any);

      await expect(sessionManager('admin').validateRefreshToken('valid-token')).rejects.toThrow(
        'Unexpected database error'
      );
    });
  });

  describe('invalidateRefreshToken', () => {
    it('should delete sessions by origin and userId', async () => {
      await sessionManager('admin').invalidateRefreshToken('user123');

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123', origin: 'admin' },
      });
    });

    it('should delete sessions by origin, userId and deviceId when provided', async () => {
      await sessionManager('admin').invalidateRefreshToken('user123', 'device456');

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123', origin: 'admin', deviceId: 'device456' },
      });
    });

    it("should not include deviceId in 'where' when not provided", async () => {
      await sessionManager('admin').invalidateRefreshToken('user123');

      expect(mockQuery.deleteMany).toHaveBeenCalledTimes(1);
      const callArg = mockQuery.deleteMany.mock.calls[0][0];
      expect(callArg.where.deviceId).toBeUndefined();
      expect(callArg.where).toEqual({ userId: 'user123', origin: 'admin' });
    });

    it('should only delete for the provided origin and userId (no over-deletion)', async () => {
      await sessionManager('admin').invalidateRefreshToken('user123');

      expect(mockQuery.deleteMany).toHaveBeenCalledTimes(1);
      const callArg = mockQuery.deleteMany.mock.calls[0][0];
      expect(Object.keys(callArg.where).sort()).toEqual(['origin', 'userId']);
      expect(callArg.where.userId).toBe('user123');
      expect(callArg.where.origin).toBe('admin');
    });
  });

  describe('generateAccessToken', () => {
    it('should use correct algorithm and expiration time for access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user123';
      const sessionId = 'session456';

      // Drive validateRefreshToken to succeed via jwt and db mocks
      mockJwt.verify.mockReturnValue({
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      } as any);
      mockQuery.findOne.mockResolvedValue({
        userId,
        sessionId,
        origin: 'admin',
        status: 'active',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      mockJwt.sign.mockReturnValue('access-jwt-token' as any);
      await sessionManager('admin').generateAccessToken(refreshToken);

      // Verify the algorithm is set to the configured algorithm
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        config.jwtSecret,
        expect.objectContaining({
          algorithm: DEFAULT_ALGORITHM,
          expiresIn: config.accessTokenLifespan,
        })
      );

      // Verify the expiration time matches the config
      const signCall = mockJwt.sign.mock.calls[0];
      const options = signCall[2];
      expect(options.expiresIn).toBe(config.accessTokenLifespan);
      expect(options.algorithm).toBe(DEFAULT_ALGORITHM);
    });

    it('should generate access token for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user123';
      const sessionId = 'session456';

      mockJwt.verify.mockReturnValue({
        userId,
        sessionId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      } as any);
      mockQuery.findOne.mockResolvedValue({
        userId,
        sessionId,
        origin: 'admin',
        status: 'active',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      mockJwt.sign.mockReturnValue('access-jwt-token' as any);

      const result = await sessionManager('admin').generateAccessToken(refreshToken);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId,
          sessionId,
          type: 'access',
        },
        config.jwtSecret,
        {
          expiresIn: config.accessTokenLifespan,
          algorithm: DEFAULT_ALGORITHM,
        }
      );
      expect(result).toEqual({
        token: 'access-jwt-token',
      });
    });

    it('should return error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';
      // Cause validateRefreshToken to fail by returning no session
      mockJwt.verify.mockReturnValue({
        userId: 'user123',
        sessionId: 'session456',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      } as any);
      mockQuery.findOne.mockResolvedValue(null);

      const result = await sessionManager('admin').generateAccessToken(refreshToken);

      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: 'invalid_refresh_token',
      });
    });

    it('should propagate errors from validateRefreshToken', async () => {
      const refreshToken = 'valid-refresh-token';
      const error = new Error('Database connection failed');

      // Make validateRefreshToken throw by causing DB to reject
      mockJwt.verify.mockReturnValue({
        userId: 'user123',
        sessionId: 'session456',
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      } as any);
      mockQuery.findOne.mockRejectedValue(error);

      await expect(sessionManager('admin').generateAccessToken(refreshToken)).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('createSessionManager factory', () => {
    it('should create session manager with database provider', () => {
      const manager = createSessionManager({ db: mockDb });

      expect(manager).toBeDefined();
      expect(typeof manager.generateSessionId).toBe('function');
      expect(typeof manager.defineOrigin).toBe('function');
      expect(typeof manager('admin')).toBe('object');
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
      deleteMany: jest.fn(),
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
        userId: 'user123',
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

    it('should create session without deviceId', async () => {
      const sessionData: SessionData = {
        userId: 'user123',
        sessionId: 'session456',
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
        userId: 'user123',
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

  describe('deleteBySessionId', () => {
    it('should delete session by sessionId', async () => {
      const sessionId = 'session123';

      await provider.deleteBySessionId(sessionId);

      expect(mockQuery.delete).toHaveBeenCalledWith({ where: { sessionId } });
    });
  });

  describe('deleteBy', () => {
    it('should delete sessions by user identifier', async () => {
      const userId = 'user123';

      await provider.deleteBy({ userId });

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    });
  });

  describe('deleteExpired', () => {
    it('should delete families that exceeded absolute expiration', async () => {
      await provider.deleteExpired();

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
        where: { absoluteExpiresAt: { $lt: expect.any(Date) } },
      });
    });
  });
});
