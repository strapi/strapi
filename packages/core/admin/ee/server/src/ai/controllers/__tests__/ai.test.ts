// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../../../tests/helpers/create-context';
import aiController from '../ai';

describe('AI Controller', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV }; // fresh copy for each test

    // Reset global fetch
    delete (global as any).fetch;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // fully restore after suite
  });

  describe('getAiToken', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
    };

    const createMockContext = (user = mockUser as any, overrides = {}) => {
      return createContext(
        {},
        {
          state: { user },
          unauthorized: jest.fn(),
          badRequest: jest.fn(),
          forbidden: jest.fn(),
          notFound: jest.fn(),
          internalServerError: jest.fn(),
          requestTimeout: jest.fn(),
          ...overrides,
        }
      );
    };

    const createMockStrapi = (config = {}) => {
      return {
        ee: { isEE: true },
        dirs: { app: { root: '/app' } },
        config: {
          get: jest.fn((key, defaultValue) => {
            if (key === 'uuid') return 'test-project-id';
            return defaultValue;
          }),
        },
        log: {
          info: jest.fn(),
          error: jest.fn(),
          http: jest.fn(),
        },
        ...config,
      };
    };

    // Helper to setup standard valid environment
    const setupValidEnvironment = () => {
      process.env.STRAPI_LICENSE = 'test-license';
      process.env.STRAPI_AI_URL = 'http://ai-server.com';
    };

    // Helper to create successful AI server response
    const createSuccessfulFetch = (responseData = {}) => {
      const defaultResponse = {
        jwt: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      };

      return jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ ...defaultResponse, ...responseData }),
      });
    };

    test('Should return unauthorized when user is not authenticated', async () => {
      const ctx = createMockContext(null);
      global.strapi = createMockStrapi() as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    test('Should return internal server error when no EE license is found', async () => {
      const ctx = createMockContext();
      const mockStrapi = createMockStrapi() as any;
      global.strapi = mockStrapi;

      // Ensure no license is available
      delete process.env.STRAPI_LICENSE;

      await aiController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );

      // Check that the specific error was logged
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
      );
    });

    test('Should return internal server error when AI server URL is not configured', async () => {
      const ctx = createMockContext();
      const mockStrapi = createMockStrapi() as any;
      global.strapi = mockStrapi;

      process.env.STRAPI_LICENSE = 'test-license';
      delete process.env.STRAPI_AI_URL;

      await aiController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );

      // Check that the specific error was logged
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: AI server URL not configured. Please set STRAPI_AI_URL environment variable.'
      );
    });

    test('Should return internal server error when project ID is not configured', async () => {
      const ctx = createMockContext();
      const mockStrapi = createMockStrapi({
        config: {
          get: jest.fn((key) => (key === 'uuid' ? null : 'default-value')),
        },
      }) as any;
      global.strapi = mockStrapi;
      setupValidEnvironment();

      await aiController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );

      // Check that the specific error was logged
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Project ID not configured'
      );
    });

    test('Should successfully return AI token when all conditions are met', async () => {
      const ctx = createMockContext();
      const mockStrapi = createMockStrapi() as any;
      global.strapi = mockStrapi;
      setupValidEnvironment();

      global.fetch = createSuccessfulFetch();

      await aiController.getAiToken(ctx as any);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ai-server.com/auth/getAiJWT',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('test-license'),
        })
      );

      expect(ctx.body).toEqual({
        data: {
          token: 'test-jwt-token',
          expiresAt: '2025-01-01T12:00:00Z',
        },
      });

      // Check that the appropriate log messages were called
      expect(mockStrapi.log.http).toHaveBeenCalledWith('Contacting AI Server for token generation');
      expect(mockStrapi.log.info).toHaveBeenCalledWith('AI token generated successfully', {
        userId: 1,
        expiresAt: '2025-01-01T12:00:00Z',
      });
    });
  });
});
