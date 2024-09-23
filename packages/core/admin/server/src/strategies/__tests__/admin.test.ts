/* eslint-disable import/no-relative-packages */
// @ts-expect-error - test purposes
import createContext from '../../../../../../../tests/helpers/create-context';
import adminAuthStrategy from '../admin';

describe('Admin Auth Strategy', () => {
  describe('Authenticate a user', () => {
    const request = {
      header: {
        authorization: 'Bearer admin_tests-jwt-token',
      },
    };

    test('Authenticates a valid JWT token', async () => {
      const decodeJwtToken = jest.fn(() => ({ isValid: true, payload: { id: 1 } }));
      const ctx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true };
      const findOne = jest.fn(() => user);
      const generateUserAbility = jest.fn(() => 'ability');

      global.strapi = {
        admin: {
          services: {
            token: { decodeJwtToken },
            permission: { engine: { generateUserAbility } },
          },
        },
        db: { query: jest.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(decodeJwtToken).toHaveBeenCalledWith('admin_tests-jwt-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({
        authenticated: true,
        credentials: user,
        ability: 'ability',
      });
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid authorization header', async () => {
      const ctx = createContext({}, { request: { header: { authorization: 'invalid-header' } } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid bearer token', async () => {
      const decodeJwtToken = jest.fn(() => ({ isValid: false }));
      const ctx = createContext({}, { request });

      global.strapi = {
        admin: {
          services: {
            token: { decodeJwtToken },
          },
        },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(decodeJwtToken).toHaveBeenCalledWith('admin_tests-jwt-token');
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid user', async () => {
      const decodeJwtToken = jest.fn(() => ({ isValid: true, payload: { id: 1 } }));
      const ctx = createContext({}, { request });
      const findOne = jest.fn(() => ({ isActive: false }));

      global.strapi = {
        admin: {
          services: {
            token: { decodeJwtToken },
          },
        },
        db: { query: jest.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(decodeJwtToken).toHaveBeenCalledWith('admin_tests-jwt-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an non-existing user', async () => {
      const decodeJwtToken = jest.fn(() => ({ isValid: true, payload: { id: 1 } }));
      const ctx = createContext({}, { request });
      const findOne = jest.fn(() => null);

      global.strapi = {
        admin: {
          services: {
            token: { decodeJwtToken },
          },
        },
        db: { query: jest.fn(() => ({ findOne })) },
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(decodeJwtToken).toHaveBeenCalledWith('admin_tests-jwt-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });
  });
});
