/* eslint-disable import/no-relative-packages */
import { errors } from '@strapi/utils';
// @ts-expect-error - test purposes
import createContext from '../../../../../../../tests/helpers/create-context';
import contentApiTokenStrategy from '../content-api-token';

describe('Content-API Token Auth Strategy', () => {
  describe('Authenticate an access key', () => {
    const request = {
      header: {
        authorization: 'Bearer api-token_tests-api-token',
      },
    };

    const contentApiRouteState = { route: { info: { type: 'content-api' } } };

    const apiToken = {
      id: 1,
      kind: 'content-api',
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const hash = jest.fn(() => 'api-token_tests-hashed-access-key');

    test('Authenticates a valid hashed access key', async () => {
      const getByAccessKey = jest.fn(() => apiToken);
      const update = jest.fn(() => apiToken);
      const ctx = createContext({}, { request, state: contentApiRouteState });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': {
              getByAccessKey,
              hash,
            },
          },
        },
        db: {
          query() {
            return { update };
          },
        },
      } as any;

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(getByAccessKey).toHaveBeenCalledWith('api-token_tests-hashed-access-key');
      expect(response).toStrictEqual({ authenticated: true, credentials: apiToken });
    });

    test('Updates lastUsedAt if the token has not been used in the last hour', async () => {
      const getByAccessKey = jest.fn(() => ({
        ...apiToken,
        lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
      }));
      const update = jest.fn(() => apiToken);
      const ctx = createContext({}, { request, state: contentApiRouteState });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': {
              getByAccessKey,
              hash,
            },
          },
        },
        db: {
          query() {
            return { update };
          },
        },
      } as any;

      await contentApiTokenStrategy.authenticate(ctx);
      expect(update).toHaveBeenCalledWith({
        data: { lastUsedAt: expect.any(Date) },
        where: { id: apiToken.id },
      });
    });

    test('Does not update lastUsedAt if the token has been used in the last hour', async () => {
      const getByAccessKey = jest.fn(() => ({
        ...apiToken,
        lastUsedAt: new Date().toISOString(),
      }));
      const update = jest.fn(() => apiToken);
      const ctx = createContext({}, { request, state: contentApiRouteState });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': {
              getByAccessKey,
              hash,
            },
          },
        },
        db: {
          query() {
            return { update };
          },
        },
      } as any;

      await contentApiTokenStrategy.authenticate(ctx);
      expect(update).not.toHaveBeenCalled();
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid authorization header', async () => {
      const ctx = createContext({}, { request: { header: { authorization: 'invalid-header' } } });

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid bearer token', async () => {
      const getByAccessKey = jest.fn(() => null);
      const ctx = createContext(
        {},
        { request: { header: { authorization: 'bearer invalid-header' } } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': {
              getByAccessKey,
              hash,
            },
          },
        },
      } as any;

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(getByAccessKey).toHaveBeenCalledWith('api-token_tests-hashed-access-key');
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Expired token returns authenticated: false with UnauthorizedError', async () => {
      const pastDate = new Date(Date.now() - 1).toISOString();

      const getByAccessKey = jest.fn(() => ({
        ...apiToken,
        expiresAt: pastDate,
      }));
      const update = jest.fn(() => apiToken);
      const ctx = createContext({}, { request, state: contentApiRouteState });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': {
              getByAccessKey,
              hash,
              update,
            },
          },
        },
      } as any;

      const { authenticated, error } = (await contentApiTokenStrategy.authenticate(ctx)) as any;

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.message).toBe('Token expired');

      expect(getByAccessKey).toHaveBeenCalledWith('api-token_tests-hashed-access-key');
    });

    test('Rejects a content-api token on an admin route (defensive kind check)', async () => {
      const adminToken = { id: 2, kind: 'admin', type: 'read-only' };
      const getByAccessKey = jest.fn(() => adminToken);
      const ctx = createContext(
        {},
        {
          request: { header: { authorization: 'Bearer test-token' } },
          state: { route: { info: { type: 'content-api' } } },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getByAccessKey, hash },
          },
          db: {
            query() {
              return { update: jest.fn() };
            },
          },
        },
      } as any;

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Authenticates a legacy token with kind: null (created before kind field existed)', async () => {
      const legacyToken = { ...apiToken, kind: null };
      const getByAccessKey = jest.fn(() => legacyToken);
      const update = jest.fn();
      const ctx = createContext({}, { request, state: contentApiRouteState });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getByAccessKey, hash },
          },
        },
        db: {
          query() {
            return { update };
          },
        },
      } as any;

      const response = await contentApiTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: true, credentials: legacyToken });
    });
  });

  describe('Verify an access key', () => {
    const readOnlyApiToken = {
      id: 1,
      kind: 'content-api',
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

    const strapiMock = {
      container: {
        get: jest.fn(() => ({
          errors: {
            UnauthorizedError: jest.fn(() => new Error()),
            ForbiddenError: jest.fn(() => new Error()),
          },
        })),
      },
      telemetry: {
        send: jest.fn(),
      },
    };

    const ability = {
      can: jest.fn((action) => {
        if (customApiToken.permissions.includes(action)) return true;
        return false;
      }),
    };

    test('Verify read-only access', () => {
      global.strapi = strapiMock as any;

      expect(
        contentApiTokenStrategy.verify(
          { credentials: readOnlyApiToken },
          { scope: ['api::model.model.find'] }
        )
      ).toBeUndefined();
    });

    test('Verify full-access access', () => {
      global.strapi = strapiMock as any;

      expect(
        contentApiTokenStrategy.verify(
          { credentials: fullAccessApiToken },
          { scope: ['api::model.model.create'] }
        )
      ).toBeUndefined();
    });

    test('Verify custom access', () => {
      global.strapi = strapiMock as any;

      expect(
        contentApiTokenStrategy.verify(
          { credentials: customApiToken, ability },
          { scope: ['api::model.model.update'] }
        )
      ).toBeUndefined();
    });

    test('Verify with expiration in future', () => {
      global.strapi = strapiMock as any;

      expect(
        contentApiTokenStrategy.verify(
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
      global.strapi = strapiMock as any;

      expect(() => {
        contentApiTokenStrategy.verify(
          {
            credentials: {
              ...readOnlyApiToken,
              expiresAt: Date.now() - 1,
            },
          },
          { scope: ['api::model.model.find'] }
        );
      }).toThrow(new errors.UnauthorizedError('Token expired'));
    });

    test('Throws if trying to access a full-access action with a read-only key', () => {
      global.strapi = strapiMock as any;

      expect.assertions(1);

      try {
        contentApiTokenStrategy.verify(
          { credentials: readOnlyApiToken },
          { scope: ['api::model.model.create'] }
        );
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('Throws if trying to access an action with a custom key without the permission', () => {
      global.strapi = strapiMock as any;

      expect.assertions(1);

      try {
        contentApiTokenStrategy.verify(
          { credentials: customApiToken, ability },
          { scope: ['api::model.model.create'] }
        );
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('Throws if the credentials are not passed in the auth object', () => {
      global.strapi = strapiMock as any;

      expect.assertions(1);

      try {
        contentApiTokenStrategy.verify({}, { scope: ['api::model.model.create'] });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('A full-access token is needed when no scope is passed', () => {
      global.strapi = strapiMock as any;

      expect(
        contentApiTokenStrategy.verify({ credentials: fullAccessApiToken }, {})
      ).toBeUndefined();
    });

    test('Throws if no scope is passed with a read-only token', () => {
      global.strapi = strapiMock as any;

      expect.assertions(1);

      try {
        contentApiTokenStrategy.verify({ credentials: readOnlyApiToken }, {});
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('Throws if no scope is passed with a custom token', () => {
      global.strapi = strapiMock as any;

      expect.assertions(1);

      try {
        contentApiTokenStrategy.verify({ credentials: customApiToken }, {});
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });
});
