import type { Context } from 'koa';

// Mock the @strapi/utils module before importing the middleware
jest.mock(
  '@strapi/utils',
  () => ({
    errors: {
      PolicyError: class PolicyError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'PolicyError';
        }
      },
    },
  }),
  { virtual: true }
);

// Import the middleware after mocking
// eslint-disable-next-line import/first
import isDevelopmentModeMiddleware from '../is-development-mode';

describe('isDevelopmentMode middleware', () => {
  let ctx: Context;
  let next: jest.Mock;

  beforeEach(() => {
    // Mock context
    ctx = {} as Context;
    next = jest.fn();

    // Mock strapi global with proper structure
    global.strapi = {
      config: {
        get: jest.fn(),
      },
      plugins: {},
      apis: {},
    } as any;
  });

  it('should allow request when autoReload is true (development mode)', async () => {
    // Arrange
    (global.strapi.config.get as jest.Mock).mockReturnValue(true);

    // Act
    await isDevelopmentModeMiddleware(ctx, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(global.strapi.config.get).toHaveBeenCalledWith('autoReload');
  });

  it('should throw PolicyError when autoReload is false (production mode)', async () => {
    // Arrange
    (global.strapi.config.get as jest.Mock).mockReturnValue(false);

    // Act & Assert
    const promise = isDevelopmentModeMiddleware(ctx, next);
    await expect(promise).rejects.toThrow(
      'Content-Type Builder modifications are disabled in production mode'
    );
    await expect(promise).rejects.toThrow(Error);
    expect(next).not.toHaveBeenCalled();
    expect(global.strapi.config.get).toHaveBeenCalledWith('autoReload');
  });

  it('should throw PolicyError when autoReload is null', async () => {
    // Arrange
    (global.strapi.config.get as jest.Mock).mockReturnValue(null);

    // Act & Assert
    await expect(isDevelopmentModeMiddleware(ctx, next)).rejects.toThrow(
      'Content-Type Builder modifications are disabled in production mode'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow request when autoReload is explicitly true (production with override)', async () => {
    // Arrange
    (global.strapi.config.get as jest.Mock).mockReturnValue(true);

    // Act
    await isDevelopmentModeMiddleware(ctx, next);

    // Assert
    expect(next).toHaveBeenCalled();
  });
});
