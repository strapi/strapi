'use strict';

const crypto = require('crypto');
const { generateAdminUserHash } = require('../admin-user-hash');
const createContext = require('../../../../../../../test/helpers/create-context');

describe('user email hash', () => {
  test('should create a hash from admin email', () => {
    const state = {
      user: {
        email: 'testemail@strapi.io',
      },
    };

    const ctx = createContext({}, { state });

    const hash = crypto.createHash('sha256').update('testemail@strapi.io').digest('hex');

    const adminUserId = generateAdminUserHash(ctx);
    expect(adminUserId).toBe(hash);
  });

  test('should return empty string if user is not available on ctx', () => {
    const ctx = createContext({}, {});

    const adminUserId = generateAdminUserHash(ctx);
    expect(adminUserId).toBe('');
  });
});
