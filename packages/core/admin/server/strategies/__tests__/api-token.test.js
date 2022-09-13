'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
const apiTokenStrategy = require('../api-token');

describe('API Token Auth Strategy', () => {
  describe('Authenticate an access key', () => {
    const request = {
      header: {
        authorization: 'Bearer api-token_tests-api-token',
      },
    };

    const apiToken = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const hash = jest.fn(() => 'api-token_tests-hashed-access-key');

    test('Authenticates a valid hashed access key', async () => {
      const getBy = jest.fn(() => apiToken);
      const ctx = createContext({}, { request });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getBy,
              hash,
            },
          },
        },
      };

      const response = await apiTokenStrategy.authenticate(ctx);

      expect(getBy).toHaveBeenCalledWith({ accessKey: 'api-token_tests-hashed-access-key' });
      expect(response).toStrictEqual({ authenticated: true, credentials: apiToken });
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await apiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid authorization header', async () => {
      const ctx = createContext({}, { request: { header: { authorization: 'invalid-header' } } });

      const response = await apiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid bearer token', async () => {
      const getBy = jest.fn(() => null);
      const ctx = createContext(
        {},
        { request: { header: { authorization: 'bearer invalid-header' } } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getBy,
              hash,
            },
          },
        },
      };

      const response = await apiTokenStrategy.authenticate(ctx);

      expect(getBy).toHaveBeenCalledWith({ accessKey: 'api-token_tests-hashed-access-key' });
      expect(response).toStrictEqual({ authenticated: false });
    });
  });

  describe('Verify an access key', () => {
    const readOnlyApiToken = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const fullAccessApiToken = {
      ...readOnlyApiToken,
      type: 'full-access',
    };

    const container = {
      get: jest.fn(() => ({
        errors: {
          UnauthorizedError: jest.fn(() => new Error()),
          ForbiddenError: jest.fn(() => new Error()),
        },
      })),
    };

    test('Verify read only access', () => {
      global.strapi = {
        container,
      };

      expect(
        apiTokenStrategy.verify(
          { credentials: readOnlyApiToken },
          { scope: ['api::model.model.find'] }
        )
      ).toBeUndefined();
    });

    test('Verify full access', () => {
      global.strapi = {
        container,
      };

      expect(
        apiTokenStrategy.verify(
          { credentials: fullAccessApiToken },
          { scope: ['api::model.model.create'] }
        )
      ).toBeUndefined();
    });

    test('Throws an error if trying to access a `full-access` action with a read only access key', () => {
      global.strapi = {
        container,
      };

      expect.assertions(1);

      try {
        apiTokenStrategy.verify(
          { credentials: { readOnlyApiToken } },
          { scope: ['api::model.model.create'] }
        );
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('Throws an error if the credentials are not passed in the auth object', () => {
      global.strapi = {
        container,
      };

      expect.assertions(1);

      try {
        apiTokenStrategy.verify({}, { scope: ['api::model.model.create'] });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('A `full-access` token is needed when no scope is passed', () => {
      global.strapi = {
        container,
      };

      expect(apiTokenStrategy.verify({ credentials: fullAccessApiToken }, {})).toBeUndefined();
    });

    test('Throws an error if no scope is passed with a `read-only` token', () => {
      global.strapi = {
        container,
      };

      expect.assertions(1);

      try {
        apiTokenStrategy.verify({ credentials: readOnlyApiToken }, {});
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
