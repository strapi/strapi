// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticatedUserController from '../authenticated-user';

describe('Authenticated User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.STRAPI_LICENSE;
    delete process.env.STRAPI_ADMIN_AI_URL;
    delete process.env.STRAPI_AI_URL;
    delete process.env.NODE_ENV;

    // Reset global fetch
    delete (global as any).fetch;
  });

  describe('getAiToken', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
    };

    const createMockContext = (user = mockUser, overrides = {}) => {
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
            if (key === 'uuid') return config.projectId || 'test-project-id';
            return defaultValue;
          }),
        },
        log: {
          info: jest.fn(),
          error: jest.fn(),
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
        projectId: 'test-project-id',
      };

      return jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ ...defaultResponse, ...responseData }),
      });
    };


    test('Should return unauthorized when user is not authenticated', async () => {
      const ctx = createMockContext(null);
      global.strapi = createMockStrapi() as any;

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    test('Should return bad request when no EE license is found', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi() as any;

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
      );
    });

    test('Should return bad request when AI server URL is not configured', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi() as any;
      process.env.STRAPI_LICENSE = 'test-license';

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'AI server URL not configured. Please set STRAPI_ADMIN_AI_URL or STRAPI_AI_URL environment variable.'
      );
    });

    test('Should return bad request when project ID is not configured', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi({
        config: {
          get: jest.fn((key) => (key === 'uuid' ? null : 'default-value')),
        },
      }) as any;
      setupValidEnvironment();

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.badRequest).toHaveBeenCalledWith('Project ID not configured');
    });

    test('Should successfully return AI token when all conditions are met', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi() as any;
      setupValidEnvironment();

      global.fetch = createSuccessfulFetch();

      await authenticatedUserController.getAiToken(ctx as any);

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
          projectId: 'test-project-id',
        },
      });
    });
  });
});
