import crypto from 'crypto';
import { generateAdminUserHash } from '../admin-user-hash';
import createContext from '../../../../../../../test/helpers/create-context';

describe('user email hash', () => {
  test('should create a hash from admin user email', () => {
    const state = {
      user: {
        email: 'testemail@strapi.io',
      },
    };

    const ctx = createContext({}, { state });

    const strapi = {
      requestContext: {
        get: jest.fn(() => ctx),
      },
    };

    const hash = crypto.createHash('sha256').update('testemail@strapi.io').digest('hex');

    const userId = generateAdminUserHash(strapi as any);
    expect(userId).toBe(hash);
  });

  test('should return empty string if user is not available on ctx', () => {
    const ctx = createContext({}, {});

    const strapi = {
      requestContext: {
        get: jest.fn(() => ctx),
      },
    };

    const userId = generateAdminUserHash(strapi as any);
    expect(userId).toBe('');
  });
});
