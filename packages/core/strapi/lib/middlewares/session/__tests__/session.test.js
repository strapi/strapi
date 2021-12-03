'use strict';

const path = require('path');
const createMiddleware = require('../index');
const configProvider = require('../../../core/registries/config');

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
      server: {
        app: {
          use: jest.fn(),
          context: {},
        },
        use: jest.fn(),
      },
      dirs: {
        root: __dirname,
      },
      config: {
        database: {
          connection: {
            client: 'mysql',
            connection: {
              host: 'host',
              port: 3306,
              database: 'test',
              username: 'user',
              password: 'password',
            },
            useNullAsDefault: true,
          },
        },
        middlewares: [
          {
            name: 'strapi::session',
            config: {
              client: 'mysql',
            },
          },
        ],
      },
    };
    mockStrapi.config = configProvider(mockStrapi.config);

    createMiddleware(mockStrapi.config.middlewares[0].config, { strapi: mockStrapi });

    expect(mockKoaMySqlSessionCalled).toBe(true);
  });
});
