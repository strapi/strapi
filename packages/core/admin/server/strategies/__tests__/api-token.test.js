'use strict';

const { UnauthorizedError } = require('@strapi/utils/lib/errors');
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
      const update = jest.fn(() => apiToken);
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
        query() {
          return { update };
        },
      };

      const response = await apiTokenStrategy.authenticate(ctx);

      expect(getBy).toHaveBeenCalledWith({ accessKey: 'api-token_tests-hashed-access-key' });
      expect(update).toHaveBeenCalledWith({
        data: { lastUsedAt: expect.any(Date) },
        where: { id: apiToken.id },
      });
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

    test('Expired token throws on authorize', async () => {
      const pastDate = new Date(Date.now() - 1).toISOString();

      const getBy = jest.fn(() => {
        return {
          ...apiToken,
          expiresAt: pastDate,
        };
      });
      const update = jest.fn(() => apiToken);
      const ctx = createContext({}, { request });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getBy,
              hash,
              update,
            },
          },
        },
      };

      const { authenticated, error } = await apiTokenStrategy.authenticate(ctx);

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Token expired');

      expect(getBy).toHaveBeenCalledWith({ accessKey: 'api-token_tests-hashed-access-key' });
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

    const customApiToken = {
      ...readOnlyApiToken,
      type: 'custom',
      permissions: ['api::model.model.update', 'api::model.model.read'],
    };

    const container = {
      get: jest.fn(() => ({
        errors: {
          UnauthorizedError: jest.fn(() => new Error()),
          ForbiddenError: jest.fn(() => new Error()),
        },
      })),
    };

    // mock ability.can (since normally it only gets added to credentials in authenticate)
    const ability = {
      can: jest.fn((ability) => {
        if (customApiToken.permissions.includes(ability)) return true;
        return false;
      }),
    };

    test('Verify read-only access', () => {
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

    test('Verify full-access access', () => {
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

    test('Verify custom access', async () => {
      global.strapi = {
        container,
      };

      expect(
        apiTokenStrategy.verify(
          { credentials: customApiToken, ability },
          { scope: ['api::model.model.update'] }
        )
      ).toBeUndefined();
    });

    test('Verify with expiration in future', () => {
      global.strapi = {
        container,
      };

      expect(
        apiTokenStrategy.verify(
          {
            credentials: {
              ...readOnlyApiToken,
              expiresAt: Date.now() + 99999,
            },
          },
          { scope: ['api::model.model.find'] }
        )
      ).toBeUndefined();
    });

    test('Throws with expired token', () => {
      global.strapi = {
        container,
      };

      expect(() => {
        apiTokenStrategy.verify(
          {
            credentials: {
              ...readOnlyApiToken,
              expiresAt: Date.now() - 1,
            },
          },
          { scope: ['api::model.model.find'] }
        );
      }).toThrow(new UnauthorizedError('Token expired'));
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

    test('Throws an error if trying to access an action with a custom access key without the permission', () => {
      global.strapi = {
        container,
      };

      expect.assertions(1);

      try {
        apiTokenStrategy.verify(
          { credentials: { customApiToken, ability } },
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

    test('Throws an error if no scope is passed with a `custom` token', () => {
      global.strapi = {
        container,
      };

      expect.assertions(1);

      try {
        apiTokenStrategy.verify({ credentials: customApiToken }, {});
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
