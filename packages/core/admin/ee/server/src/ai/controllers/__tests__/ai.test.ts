// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../../../tests/helpers/create-context';
import aiController from '../ai';

describe('AI Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          internalServerError: jest.fn(),
          ...overrides,
        }
      );
    };

    const createMockStrapi = (aiContainer = {}) => {
      return {
        get: jest.fn((service) => {
          if (service === 'ai') {
            return {
              getAiToken: jest.fn(),
              ...aiContainer,
            };
          }
          return {};
        }),
      };
    };

    test('Should return unauthorized when user is not authenticated', async () => {
      const ctx = createMockContext(null);
      global.strapi = createMockStrapi() as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    test('Should return internal server error when AI container throws error', async () => {
      const ctx = createMockContext();
      const mockAiContainer = {
        getAiToken: jest.fn().mockRejectedValue(new Error('Container error')),
      };
      global.strapi = createMockStrapi(mockAiContainer) as any;

      await aiController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );
      expect(mockAiContainer.getAiToken).toHaveBeenCalled();
    });

    test('Should successfully return AI token when container returns token', async () => {
      const ctx = createMockContext();
      const mockTokenData = {
        token: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      };
      const mockAiContainer = {
        getAiToken: jest.fn().mockResolvedValue(mockTokenData),
      };
      global.strapi = createMockStrapi(mockAiContainer) as any;

      await aiController.getAiToken(ctx as any);

      expect(mockAiContainer.getAiToken).toHaveBeenCalled();
      expect(ctx.body).toEqual({
        data: mockTokenData,
      });
    });

    test('Should delegate to AI container and return formatted response', async () => {
      const ctx = createMockContext();
      const mockAiContainer = {
        getAiToken: jest
          .fn()
          .mockResolvedValue({ token: 'test-token', expiresAt: '2025-01-01T12:00:00Z' }),
      };
      global.strapi = createMockStrapi(mockAiContainer) as any;

      await aiController.getAiToken(ctx as any);

      expect(global.strapi.get).toHaveBeenCalledWith('ai');
      expect(mockAiContainer.getAiToken).toHaveBeenCalled();
    });
  });
});
