'use strict';

const { validatePassword, hashPassword } = require('../auth');

describe('Auth', () => {
  describe('validatePassword', () => {
    test('Compares password with hash', async () => {
      const password = 'pcw123';
      const hash = hashPassword(password);

      const isValid = await validatePassword(password, hash);
      expect(isValid).toBe(true);
    });
  });
});
