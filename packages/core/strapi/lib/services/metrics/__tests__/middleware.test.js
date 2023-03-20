'use strict';

const createMiddleware = require('../middleware');

describe('Metrics middleware', () => {
  test('Ignores request with extension in them', async () => {
    const sendEvent = jest.fn();

    const middleware = createMiddleware({ sendEvent });

    await middleware(
      {
        request: {
          method: 'GET',
          url: '/uploads/image.png',
        },
      },
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
      },
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
        },
        jest.fn()
      );
    }

    expect(sendEvent).toHaveBeenCalledTimes(1000);
  });
});
