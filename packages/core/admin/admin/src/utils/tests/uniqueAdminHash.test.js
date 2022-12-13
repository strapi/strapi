import crypto from 'crypto';
import { TextEncoder } from 'util';
import hashAdminUserEmail, { utils } from '../uniqueAdminHash';

const testHashValue = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';

describe('Creating admin user email hash in admin', () => {
  afterAll(() => {
    Object.defineProperty(global.self, 'crypto', {
      value: undefined,
    });
    Object.defineProperty(global.self, 'TextEncoder', {
      value: undefined,
    });
  });

  it('should return empty string if no payload provided', async () => {
    const testHash = await hashAdminUserEmail();

    expect(testHash).toBe(null);
  });

  it('should return hash using crypto subtle', async () => {
    Object.defineProperty(global.self, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn((type, message) => crypto.createHash('sha256').update(message).digest()),
        },
      },
      configurable: true,
    });

    Object.defineProperty(global.self, 'TextEncoder', {
      value: TextEncoder,
      configurable: true,
    });

    const payload = {
      email: 'testemail@strapi.io',
    };

    const spy = jest.spyOn(utils, 'digestMessage');

    const testHash = await hashAdminUserEmail(payload);

    expect(spy).toHaveBeenCalled();
    expect(testHash).toBe(testHashValue);
  });
});
