// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../../tests/helpers/create-context';
import aiController from '../ai';

describe('AI Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        internalServerError: jest.fn(),
        notFound: jest.fn(),
        ...overrides,
      }
    );
  };

  const createMockStrapi = (adminService = {}, aiEnabled = true) => {
    return {
      ai: {
        admin: {
          isEnabled: jest.fn().mockReturnValue(aiEnabled),
          getAiToken: jest.fn(),
          getAiUsage: jest.fn(),
          getAiFeatureConfig: jest.fn(),
          ...adminService,
        },
      },
    };
  };

  describe('when AI is disabled', () => {
    test('getAiToken returns notFound', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi({}, false) as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.notFound).toHaveBeenCalled();
    });

    test('getAiUsage returns notFound', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi({}, false) as any;

      await aiController.getAiUsage(ctx as any);

      expect(ctx.notFound).toHaveBeenCalled();
    });

    test('getAiFeatureConfig returns notFound', async () => {
      const ctx = createMockContext();
      global.strapi = createMockStrapi({}, false) as any;

      await aiController.getAiFeatureConfig(ctx as any);

      expect(ctx.notFound).toHaveBeenCalled();
    });
  });

  describe('getAiToken', () => {
    test('Should return unauthorized when user is not authenticated', async () => {
      const ctx = createMockContext(null);
      global.strapi = createMockStrapi() as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    test('Should return internal server error when AI container throws error', async () => {
      const ctx = createMockContext();
      const mockAdminService = {
        getAiToken: jest.fn().mockRejectedValue(new Error('Container error')),
      };
      global.strapi = createMockStrapi(mockAdminService) as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );
      expect(mockAdminService.getAiToken).toHaveBeenCalled();
    });

    test('Should successfully return AI token when container returns token', async () => {
      const ctx = createMockContext();
      const mockTokenData = {
        token: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      };
      const mockAdminService = {
        getAiToken: jest.fn().mockResolvedValue(mockTokenData),
      };
      global.strapi = createMockStrapi(mockAdminService) as any;

      await aiController.getAiToken(ctx as any);

      expect(mockAdminService.getAiToken).toHaveBeenCalled();
      expect(ctx.body).toEqual({
        data: mockTokenData,
      });
    });
  });

  describe('getAiUsage', () => {
    test('Should delegate to admin service and set ctx.body', async () => {
      const ctx = createMockContext();
      const mockUsage = {
        cmsAiCreditsUsed: 42,
        subscription: { subscriptionId: 'sub-1', isActiveSubscription: true },
      };
      const mockAdminService = {
        getAiUsage: jest.fn().mockResolvedValue(mockUsage),
      };
      global.strapi = createMockStrapi(mockAdminService) as any;

      await aiController.getAiUsage(ctx as any);

      expect(mockAdminService.getAiUsage).toHaveBeenCalled();
      expect(ctx.body).toEqual(mockUsage);
    });

    test('Should return internalServerError when admin service throws', async () => {
      const ctx = createMockContext();
      const mockAdminService = {
        getAiUsage: jest.fn().mockRejectedValue(new Error('Service error')),
      };
      global.strapi = createMockStrapi(mockAdminService) as any;

      await aiController.getAiUsage(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI usage data request failed. Check server logs for details.'
      );
    });
  });

  describe('getAiFeatureConfig', () => {
    test('Should delegate to admin service and set ctx.body', async () => {
      const ctx = createMockContext();
      const mockConfig = { isAiI18nConfigured: true, isAiMediaLibraryConfigured: false };
      const mockAdminService = {
        getAiFeatureConfig: jest.fn().mockResolvedValue(mockConfig),
      };
      global.strapi = createMockStrapi(mockAdminService) as any;

      await aiController.getAiFeatureConfig(ctx as any);

      expect(mockAdminService.getAiFeatureConfig).toHaveBeenCalled();
      expect(ctx.body).toEqual({ data: mockConfig });
    });
  });
});
