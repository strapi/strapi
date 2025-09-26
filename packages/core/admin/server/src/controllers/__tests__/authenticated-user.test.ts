// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import authenticatedUserController from '../authenticated-user';

// Mock the getService function
const mockUserService = {
  getAiToken: jest.fn(),
};

jest.mock('../../utils', () => ({
  getService: jest.fn((serviceName: string) => {
    if (serviceName === 'user') {
      return mockUserService;
    }
    return {};
  }),
}));

describe('Authenticated User Controller', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserService.getAiToken.mockReset();
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

    test('Should return unauthorized when user is not authenticated', async () => {
      const ctx = createMockContext(null);

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    test('Should return internal server error when service throws error', async () => {
      const ctx = createMockContext();

      // Mock service to throw an error
      mockUserService.getAiToken.mockRejectedValueOnce(new Error('Service error'));

      await authenticatedUserController.getAiToken(ctx as any);

      expect(ctx.internalServerError).toHaveBeenCalledWith(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockUserService.getAiToken).toHaveBeenCalledWith();
    });

    test('Should successfully return AI token when service succeeds', async () => {
      const ctx = createMockContext();
      const tokenData = {
        token: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      };

      // Mock service to return successful result
      mockUserService.getAiToken.mockResolvedValueOnce(tokenData);

      await authenticatedUserController.getAiToken(ctx as any);

      expect(mockUserService.getAiToken).toHaveBeenCalledWith();
      expect(ctx.body).toEqual({
        data: tokenData,
      });
    });
  });
});
