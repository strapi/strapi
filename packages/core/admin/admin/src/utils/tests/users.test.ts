import crypto from 'crypto';
import { TextEncoder } from 'util';

import { hashAdminUserEmail, getInitials, getDisplayName } from '../users';

const testHashValue = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';

describe('users', () => {
  describe('getDisplayName', () => {
    it('returns username if present', () => {
      expect(getDisplayName({ username: 'foobar' })).toBe('foobar');
    });

    it('returns firstname and lastname if no username present', () => {
      expect(getDisplayName({ firstname: 'John', lastname: 'Doe' })).toBe('John Doe');
    });

    it('returns only firstname if lastname is missing', () => {
      expect(getDisplayName({ firstname: 'Alice' })).toBe('Alice');
    });

    it('returns email if no names', () => {
      expect(getDisplayName({ email: 'user@example.com' })).toBe('user@example.com');
    });

    it('returns empty string if no fields provided', () => {
      expect(getDisplayName({})).toBe('');
    });
  });

  describe('getInitials', () => {
    it('returns initials from firstname and lastname', () => {
      expect(getInitials({ firstname: 'John', lastname: 'Doe' })).toBe('JD');
    });

    it('returns first letter of firstname if no lastname', () => {
      expect(getInitials({ firstname: 'Alice' })).toBe('A');
    });

    it('returns first letter of username if no firstname/lastname', () => {
      expect(getInitials({ username: 'foobar' })).toBe('F');
    });

    it('returns first letter of email if no name fields', () => {
      expect(getInitials({ email: 'user@example.com' })).toBe('U');
    });

    it('returns empty string for empty object', () => {
      expect(getInitials({})).toBe('');
    });
  });

  describe('hashAdminUserEmail', () => {
    afterAll(() => {
      Object.defineProperty(window.self, 'crypto', {
        value: undefined,
      });

      Object.defineProperty(window.self, 'TextEncoder', {
        value: undefined,
      });
    });

    it('should return empty string if no payload provided', async () => {
      const testHash = await hashAdminUserEmail();

      expect(testHash).toBe(null);
    });

    it('should return hash using crypto subtle', async () => {
      Object.defineProperty(window.self, 'crypto', {
        value: {
          subtle: {
            digest: jest.fn((type, message) =>
              crypto.createHash('sha256').update(message).digest()
            ),
          },
        },
        configurable: true,
      });

      Object.defineProperty(window.self, 'TextEncoder', {
        value: TextEncoder,
        configurable: true,
      });

      const payload = {
        id: 1,
        firstname: 'Test',
        isActive: true,
        blocked: false,
        email: 'testemail@strapi.io',
        preferedLanguage: 'en',
        roles: [],
        createdAt: '2021-07-06T08:00:00.000Z',
        updatedAt: '2021-07-06T08:00:00.000Z',
      };

      const testHash = await hashAdminUserEmail(payload);

      expect(testHash).toBe(testHashValue);
    });
  });
});
