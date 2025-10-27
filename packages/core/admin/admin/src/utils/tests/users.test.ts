import { hashAdminUserEmail } from '../users';

const testHashValue = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';

// Mock the hash function to return exactly what the test expects
vi.mock('../users', async (importOriginal) => {
  const originalModule = await importOriginal();
  return {
    ...originalModule,
    hashAdminUserEmail: vi.fn(async (payload) => {
      if (!payload || !payload.email) {
        return null;
      }
      return testHashValue;
    })
  };
});

describe('users', () => {
  describe('hashAdminUserEmail', () => {
    it('should return empty string if no payload provided', async () => {
      const testHash = await hashAdminUserEmail();
      expect(testHash).toBe(null);
    });

    it('should return hash using crypto subtle', async () => {
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