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

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
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

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({ where: { user: userId } });
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions', async () => {
      await provider.deleteExpired();

      expect(mockQuery.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { $lt: expect.any(Date) } },
      });
    });
  });
});
