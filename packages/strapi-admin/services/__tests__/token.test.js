'use strict';

const { createToken, getTokenOptions, decodeToken } = require('../token');

const delay = time => new Promise(resolve => setTimeout(resolve, time));

describe('Token', () => {
  describe('token options', () => {
    test('Has defaults', () => {
      const getFn = jest.fn(() => ({}));
      global.strapi = {
        config: {
          get: getFn,
        },
      };

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('server.admin.auth', {});
      expect(res).toEqual({ options: { expiresIn: '30d' } });
    });

    test('Merges defaults with configuration', () => {
      const config = {
        options: {},
        secret: '123',
      };

      const getFn = jest.fn(() => config);
      global.strapi = {
        config: {
          get: getFn,
        },
      };

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('server.admin.auth', {});
      expect(res).toEqual({
        options: {
          expiresIn: '30d',
        },
        secret: config.secret,
      });
    });

    test('Overwrite defaults with configuration options', () => {
      const config = {
        options: {
          expiresIn: '1d',
        },
        secret: '123',
      };

      const getFn = jest.fn(() => config);
      global.strapi = {
        config: {
          get: getFn,
        },
      };

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('server.admin.auth', {});
      expect(res).toEqual({
        options: {
          expiresIn: '1d',
        },
        secret: config.secret,
      });
    });
  });

  describe('createToken', () => {
    test('Returns a jwt token', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      };

      const token = createToken({ id: 1 });

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
    });

    test('token payload does not leak user infos', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      };

      const token = createToken({
        id: 1,
        password: 'pcw123',
        firstname: 'Test',
        email: 'test@strapi.io',
      });

      const { payload } = decodeToken(token);

      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });
  });

  describe('decodeToken', () => {
    test('Fails if the token is invalid', () => {
      const { payload, isValid } = decodeToken('invalid-token');
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Fails if the token was not generated with the same secret', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      };

      const user = { id: 1 };
      const token = createToken(user);

      global.strapi = {
        config: {
          get() {
            return {
              secret: 'not-the-same-secret',
            };
          },
        },
      };

      const { payload, isValid } = decodeToken(token);
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Fails if the token has expired', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              options: {
                expiresIn: 1,
              },
              secret: 'test-123',
            };
          },
        },
      };

      await delay(10);

      const user = { id: 1 };
      const token = createToken(user);

      global.strapi = {
        config: {
          get() {
            return {
              secret: 'not-the-same-secret',
            };
          },
        },
      };

      const { payload, isValid } = decodeToken(token);
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Returns payload if token is valid', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      };

      const user = { id: 1 };
      const token = createToken(user);

      const { payload, isValid } = decodeToken(token);
      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
      expect(isValid).toBe(true);
    });
  });
});
