'use strict';

const crypto = require('crypto');

const { createJwtToken, getTokenOptions, decodeJwtToken, createToken } = require('../token');

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

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({
        secret: undefined,
        signOptions: { expiresIn: '30d' },
        verifyOptions: {},
      });
    });

    test('Merges defaults with configuration', () => {
      const config = {
        secret: '123',
        signOptions: {},
        verifyOptions: { algorithms: ['HS256'] },
      };

      const getFn = jest.fn(() => config);

      global.strapi = {
        config: {
          get: getFn,
        },
      };

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({
        secret: config.secret,
        signOptions: { expiresIn: '30d' },
        verifyOptions: { algorithms: ['HS256'] },
      });
    });

    test('Overwrite defaults with configuration options', () => {
      const config = {
        secret: '123',
        signOptions: { expiresIn: '1d' },
        verifyOptions: {},
      };

      const getFn = jest.fn(() => config);

      global.strapi = {
        config: {
          get: getFn,
        },
      };

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({
        secret: config.secret,
        signOptions: { expiresIn: '1d' },
        verifyOptions: {},
      });
    });
  });

  describe('createJwtToken', () => {
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

      const token = createJwtToken({ id: 1 });

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
    });

    test('Token payload does not leak user infos', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      };

      const token = createJwtToken({
        id: 1,
        password: 'pcw123',
        firstname: 'Test',
        email: 'test@strapi.io',
      });

      const { payload } = decodeJwtToken(token);

      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    test('Token is created with the passed in sign algorithm and should decode if the sign and verify algorithms do match', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

      global.strapi = {
        config: {
          get() {
            return {
              secret: privateKey,
              signOptions: { algorithm: 'RS256' },
              verifyOptions: { algorithms: ['RS256'] },
            };
          },
        },
      };

      const token = createJwtToken({
        id: 1,
        password: 'pcw123',
        firstname: 'Test',
        email: 'test@strapi.io',
      });

      const { payload } = decodeJwtToken(token);

      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    test('Token is created with the passed in sign algorithm and should fail decode if the sign and verify algorithms do not match', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

      global.strapi = {
        config: {
          get() {
            return {
              secret: privateKey,
              signOptions: { algorithm: 'RS256' },
            };
          },
        },
      };

      const token = createJwtToken({
        id: 1,
        password: 'pcw123',
        firstname: 'Test',
        email: 'test@strapi.io',
      });

      const decoded = decodeJwtToken(token);

      // should error because the signOptions.algorithm does not match
      // the verifyOptions.algorithms
      expect(decoded).toEqual({
        payload: null,
        isValid: false,
      });
    });
  });

  describe('decodeJwtToken', () => {
    test('Fails if the token is invalid', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: '',
              signOptions: {},
              verifyOptions: {},
            };
          },
        },
      };

      const { payload, isValid } = decodeJwtToken('invalid-token');

      expect(isValid).toBe(false);
      expect(payload).toBe(null);
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
      const token = createJwtToken(user);

      global.strapi = {
        config: {
          get() {
            return {
              secret: 'not-the-same-secret',
            };
          },
        },
      };

      const { payload, isValid } = decodeJwtToken(token);

      expect(isValid).toBe(false);
      expect(payload).toBe(null);
    });

    test('Fails if the token has expired', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              signOptions: {
                expiresIn: '1ms',
              },
              secret: 'test-123',
            };
          },
        },
      };

      const user = { id: 1 };
      const token = createJwtToken(user);

      await delay(10);

      const { payload, isValid } = decodeJwtToken(token);

      expect(isValid).toBe(false);
      expect(payload).toBe(null);
    });

    test('Fails to decode token if the verify algorith does not include the sign algorithm', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
              signOptions: { expiresIn: '30d', algorithm: 'HS256' },
              verifyOptions: { algorithms: ['RS256'] },
            };
          },
        },
      };

      const user = { id: 1 };
      const token = createJwtToken(user);

      const decoded = decodeJwtToken(token);

      // should error because the signOptions.algorithm does not match
      // the verifyOptions.algorithms
      expect(decoded).toEqual({
        payload: null,
        isValid: false,
      });
    });

    test('Returns payload if token is valid', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              signOptions: { expiresIn: '30d' },
              secret: 'test-123',
            };
          },
        },
      };

      const user = { id: 1 };
      const token = createJwtToken(user);

      const { payload, isValid } = decodeJwtToken(token);

      expect(isValid).toBe(true);
      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });
  });

  describe('createToken', () => {
    test('Create a random token of length 128', () => {
      const token = createToken();

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
      expect(token.length).toBe(40);
    });
  });
});
