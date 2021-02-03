'use strict';

const path = require('path');
const createMiddleware = require('../index');
const configProvider = require('../../../core/app-configuration/config-provider');

describe('Session middleware', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('It uses the configured databases', async () => {
    let mockKoaMySqlSessionCalled = false;
    jest.doMock(
      path.resolve(__dirname, 'node_modules', 'koa-mysql-session'),
      () => {
        return function(options) {
          mockKoaMySqlSessionCalled = true;
          this.options = options;
          this.get = jest.fn();
          this.set = jest.fn();
          this.destroy = jest.fn();
          return this;
        };
      },
      { virtual: true }
    );

    const mockStrapi = {
      app: {
        use: jest.fn(),
        context: {},
      },
      config: {
        appPath: __dirname,
        database: {
          connections: {
            mysql: {},
          },
        },
        middleware: {
          settings: {
            session: {
              client: 'mysql',
              connection: 'mysql',
            },
          },
        },
      },
    };
    mockStrapi.config = configProvider(mockStrapi.config);

    const middleware = createMiddleware(mockStrapi);
    middleware.initialize();
    expect(mockKoaMySqlSessionCalled).toBe(true);
  });
});
