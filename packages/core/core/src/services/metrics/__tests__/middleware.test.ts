import createMiddleware from '../middleware';

describe('Metrics middleware', () => {
  const originalDateNow = Date.now;

  afterEach(() => {
    Date.now = originalDateNow;
  });

  test('Ignores request with extension in them', async () => {
    const sendEvent = jest.fn();

    const middleware = createMiddleware({ sendEvent });

    await middleware(
      {
        request: {
          method: 'GET',
          url: '/uploads/image.png',
        },
      } as any,
      jest.fn()
    );

    expect(sendEvent).not.toHaveBeenCalled();
  });

  test.each(['OPTIONS', 'HEAD'])('Ignores %s method', async (method) => {
    const sendEvent = jest.fn();

    const middleware = createMiddleware({ sendEvent });

    await middleware(
      {
        request: {
          method,
          url: '/some-api',
        },
      } as any,
      jest.fn()
    );

    expect(sendEvent).not.toHaveBeenCalled();
  });

  test('Stops sending after 1000 events', async () => {
    const sendEvent = jest.fn();
    const middleware = createMiddleware({ sendEvent });

    for (let i = 0; i < 2000; i += 1) {
      await middleware(
        {
          request: {
            method: 'GET',
            url: '/some-api',
          },
        } as any,
        jest.fn()
      );
    }

    expect(sendEvent).toHaveBeenCalledTimes(1000);
  });

  test('Resets counter after 24 hours', async () => {
    const sendEvent = jest.fn();
    Date.now = () => new Date('2021-01-01T00:00:00Z').getTime();

    const middleware = createMiddleware({ sendEvent });

    for (let i = 0; i < 2000; i += 1) {
      await middleware(
        {
          request: {
            method: 'GET',
            url: '/some-api',
          },
        } as any,
        jest.fn()
      );
    }

    Date.now = () => new Date('2021-01-02T00:01:00Z').getTime(); // 1 day and 1 minute later.

    await middleware(
      {
        request: {
          method: 'GET',
          url: '/some-api',
        },
      } as any,
      jest.fn()
    );

    expect(sendEvent).toHaveBeenCalledTimes(1001);
  });
});
