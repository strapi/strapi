import crypto from 'crypto';
import { TextEncoder } from 'util';

import { hashAdminUserEmail } from '../users';

const testHashValue = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';

describe('users', () => {
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
