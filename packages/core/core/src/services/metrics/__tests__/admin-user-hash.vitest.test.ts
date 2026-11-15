import { describe, test, expect, vi } from 'vitest';
import crypto from 'crypto';
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import { generateAdminUserHash } from '../admin-user-hash';

describe('user email hash', () => {
  test('should create a hash from admin user email', () => {
    const state = {
      user: {
        email: 'testemail@strapi.io',
      },
    };

    const ctx = createContext({}, { state });

    const strapi = {
      has: vi.fn(() => true),
      requestContext: {
        get: vi.fn(() => ctx),
      },
    };

    const hash = crypto.createHash('sha256').update('testemail@strapi.io').digest('hex');

    const userId = generateAdminUserHash(strapi as any);
    expect(userId).toBe(hash);
  });

  test('should return empty string if user is not available on ctx', () => {
    const ctx = createContext({}, {});

    const strapi = {
      has: vi.fn(() => true),
      requestContext: {
        get: vi.fn(() => ctx),
      },
    };

    const userId = generateAdminUserHash(strapi as any);
    expect(userId).toBe('');
  });

  test('returns empty string after request context has been released', () => {
    const strapi = {
      has: vi.fn(() => false),
      get requestContext() {
        throw new Error('Could not resolve service requestContext');
      },
    };

    expect(generateAdminUserHash(strapi as any)).toBe('');
  });
});
