import { describe, test, expect, vi, afterEach } from 'vitest';
import createMiddleware from '../middleware';

describe('Metrics middleware', () => {
  const originalDateNow = Date.now;

  const mockStrapi = {
    config: {
      get: vi.fn().mockReturnValue('/api'),
    },
  } as any;

  afterEach(() => {
    Date.now = originalDateNow;
    vi.clearAllMocks();
  });

  test('Ignores request with extension in them', async () => {
    const sendEvent = vi.fn().mockResolvedValue(undefined);

    const middleware = createMiddleware({ sendEvent, strapi: mockStrapi });

    await middleware(
      {
        request: {
          method: 'GET',
          url: '/uploads/image.png',
        },
      } as any,
      vi.fn()
    );

    expect(sendEvent).not.toHaveBeenCalled();
  });

  test.each(['OPTIONS', 'HEAD'])('Ignores %s method', async (method) => {
    const sendEvent = vi.fn().mockResolvedValue(undefined);

    const middleware = createMiddleware({ sendEvent, strapi: mockStrapi });

    await middleware(
      {
        request: {
          method,
          url: '/some-api',
        },
      } as any,
      vi.fn()
    );

    expect(sendEvent).not.toHaveBeenCalled();
  });

  test('Stops sending after 1000 events', async () => {
    const sendEvent = vi.fn().mockResolvedValue(undefined);
    const middleware = createMiddleware({ sendEvent, strapi: mockStrapi });

    for (let i = 0; i < 2000; i += 1) {
      const mockRes = {
        once: vi.fn((event, callback) => {
          // Simulate event emission immediately
          process.nextTick(() => callback());
        }),
      };
      const mockResponse = { status: 200 };

      await middleware(
        {
          request: {
            method: 'GET',
            url: '/api/articles',
          },
          res: mockRes,
          response: mockResponse,
        } as any,
        vi.fn()
      );
    }

    // Wait for all async callbacks to complete
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(sendEvent).toHaveBeenCalledTimes(1000);
  });

  test('Resets counter after 24 hours', async () => {
    const sendEvent = vi.fn().mockResolvedValue(undefined);
    Date.now = () => new Date('2021-01-01T00:00:00Z').getTime();

    const middleware = createMiddleware({ sendEvent, strapi: mockStrapi });

    for (let i = 0; i < 2000; i += 1) {
      const mockRes = {
        once: vi.fn((event, callback) => {
          // Simulate event emission immediately
          process.nextTick(() => callback());
        }),
      };
      const mockResponse = { status: 200 };

      await middleware(
        {
          request: {
            method: 'GET',
            url: '/api/articles',
          },
          res: mockRes,
          response: mockResponse,
        } as any,
        vi.fn()
      );
    }

    Date.now = () => new Date('2021-01-02T00:01:00Z').getTime(); // 1 day and 1 minute later.

    const mockRes = {
      once: vi.fn((event, callback) => {
        // Simulate event emission immediately
        process.nextTick(() => callback());
      }),
    };
    const mockResponse = { status: 200 };

    await middleware(
      {
        request: {
          method: 'GET',
          url: '/api/articles',
        },
        res: mockRes,
        response: mockResponse,
      } as any,
      vi.fn()
    );

    // Wait for all async callbacks to complete
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(sendEvent).toHaveBeenCalledTimes(1001);
  });
});
