import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createSessionManager, SessionData } from '../session-manager';

// Generate test RSA key pair
const generateRSAKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
};

const { publicKey: testPublicKey, privateKey: testPrivateKey } = generateRSAKeyPair();

describe('SessionManager JWT Configuration', () => {
  let sessionManager: any;
  let mockDb: any;

  beforeEach(() => {
    const mockQuery = {
      create: jest.fn((data: SessionData) => {
        return {
          ...data,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

    // Mock database query to return valid session data
    mockQuery.findOne.mockImplementation(() => {
      // Return session data for refresh token validation
      return Promise.resolve({
        userId: 'user123',
        sessionId: 'session123',
        origin: 'test',
        status: 'active',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    sessionManager = createSessionManager({ db: mockDb });
  });

  describe('Default Configuration', () => {
    test('Uses default HS256 algorithm when no algorithm is specified', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify algorithm
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('HS256');
    });
  });

  describe('Symmetric Algorithm Configuration', () => {
    test('Uses configured symmetric algorithm (HS512)', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS512',
        jwtOptions: {
          issuer: 'test-issuer',
          audience: 'test-audience',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify algorithm and options
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('HS512');
      expect((decoded?.payload as any)?.iss).toBe('test-issuer');
      expect((decoded?.payload as any)?.aud).toBe('test-audience');
    });

    test('Uses configured symmetric algorithm (HS384)', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS384',
        jwtOptions: {
          subject: 'test-subject',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify algorithm and options
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('HS384');
      expect((decoded?.payload as any)?.sub).toBe('test-subject');
    });
  });

  describe('Asymmetric Algorithm Configuration', () => {
    test('Uses configured asymmetric algorithm (RS256) with proper keys', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret', // Fallback for backward compatibility
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'RS256',
        jwtOptions: {
          privateKey: testPrivateKey,
          publicKey: testPublicKey,
          issuer: 'rsa-test-issuer',
          audience: 'rsa-test-audience',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify algorithm and options
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('RS256');
      expect((decoded?.payload as any)?.iss).toBe('rsa-test-issuer');
      expect((decoded?.payload as any)?.aud).toBe('rsa-test-audience');

      // Verify the token can be verified with the public key
      const verified = jwt.verify(result.token, testPublicKey, {
        algorithms: ['RS256'],
        issuer: 'rsa-test-issuer',
        audience: 'rsa-test-audience',
      });

      expect(verified).toBeDefined();
      expect((verified as any).type).toBe('access');
    });

    test('Uses configured asymmetric algorithm (ES256) with proper keys', async () => {
      // Generate ES256 key pair
      const { publicKey: esPublicKey, privateKey: esPrivateKey } = crypto.generateKeyPairSync(
        'ec',
        {
          namedCurve: 'prime256v1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
          },
        }
      );

      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'ES256',
        jwtOptions: {
          privateKey: esPrivateKey,
          publicKey: esPublicKey,
          issuer: 'es256-test-issuer',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify algorithm
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('ES256');
      expect((decoded?.payload as any)?.iss).toBe('es256-test-issuer');
    });
  });

  describe('JWT Options Integration', () => {
    test('Passes through all JWT options to jwt.sign', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS256',
        jwtOptions: {
          issuer: 'test-issuer',
          audience: 'test-audience',
          subject: 'test-subject',
          expiresIn: '1h',
          notBefore: '0',
          jwtid: 'test-jwt-id',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Decode and verify all options
      const decoded = jwt.decode(result.token, { complete: true });
      expect((decoded?.payload as any)?.iss).toBe('test-issuer');
      expect((decoded?.payload as any)?.aud).toBe('test-audience');
      expect((decoded?.payload as any)?.sub).toBe('test-subject');
      expect((decoded?.payload as any)?.jti).toBe('test-jwt-id');
    });

    test('JWT options work with refresh tokens', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS256',
        jwtOptions: {
          issuer: 'refresh-test-issuer',
          audience: 'refresh-test-audience',
        },
      });

      const result = await sessionManager('test').generateRefreshToken('user123', 'device123');

      expect(result.token).toBeDefined();

      // Decode and verify options
      const decoded = jwt.decode(result.token, { complete: true });
      expect((decoded?.payload as any)?.iss).toBe('refresh-test-issuer');
      expect((decoded?.payload as any)?.aud).toBe('refresh-test-audience');
      expect((decoded?.payload as any)?.type).toBe('refresh');
    });
  });

  describe('Error Handling', () => {
    test('Throws error when asymmetric algorithm is used without proper keys', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'RS256',
        jwtOptions: {
          // Missing privateKey and publicKey
        },
      });

      // Should throw error immediately when trying to generate refresh token
      await expect(
        sessionManager('test').generateRefreshToken('user123', 'session123')
      ).rejects.toThrow('Private key is required for asymmetric algorithm RS256');
    });

    test('Works correctly with symmetric algorithm', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS256',
        jwtOptions: {
          issuer: 'test-issuer',
        },
      });

      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      expect(result.token).toBeDefined();

      // Verify the token works
      const decoded = jwt.decode(result.token, { complete: true });
      expect(decoded?.header.alg).toBe('HS256');
      expect((decoded?.payload as any)?.iss).toBe('test-issuer');
    });

    test('Throws error when symmetric algorithm is used without secret', async () => {
      sessionManager.defineOrigin('test', {
        // Missing jwtSecret
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS256',
      });

      await expect(
        sessionManager('test').generateAccessToken('user123', 'session123')
      ).rejects.toThrow('Secret key is required for symmetric algorithm HS256');
    });
  });

  describe('Token Validation', () => {
    test('Validates tokens with correct algorithm and options', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'HS256',
        jwtOptions: {
          issuer: 'validation-test-issuer',
          audience: 'validation-test-audience',
        },
      });

      // Generate token
      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      // Validate token
      const validation = await sessionManager('test').validateAccessToken(result.token);

      expect(validation.isValid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe('user123');
      expect(validation.payload?.sessionId).toBeDefined();
      expect(validation.payload?.sessionId).toBeTruthy();
    });

    test('Validates asymmetric tokens correctly', async () => {
      sessionManager.defineOrigin('test', {
        jwtSecret: 'test-secret',
        accessTokenLifespan: 3600,
        maxRefreshTokenLifespan: 86400,
        idleRefreshTokenLifespan: 3600,
        maxSessionLifespan: 3600,
        idleSessionLifespan: 1800,
        algorithm: 'RS256',
        jwtOptions: {
          privateKey: testPrivateKey,
          publicKey: testPublicKey,
          issuer: 'rsa-validation-issuer',
        },
      });

      // Generate token
      // First generate a refresh token
      const refreshResult = await sessionManager('test').generateRefreshToken(
        'user123',
        'session123'
      );
      expect(refreshResult.token).toBeDefined();

      // Then generate access token using the refresh token
      const result = await sessionManager('test').generateAccessToken(refreshResult.token);

      // Validate token
      const validation = await sessionManager('test').validateAccessToken(result.token);

      expect(validation.isValid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe('user123');
      expect(validation.payload?.sessionId).toBeDefined();
      expect(validation.payload?.sessionId).toBeTruthy();
    });
  });
});
