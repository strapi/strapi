import { TextEncoder } from 'util';
import hashAdminUserEmail, { utils } from '../uniqueAdminHash';

const testHashValue = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';

describe('Creating admin user email hash in admin', () => {
  afterEach(() => {
    Object.defineProperty(global.self, 'crypto', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(global.self, 'TextEncoder', {
      value: undefined,
      configurable: true,
    });
  });

  it('should return empty string if no payload provided', async () => {
    const testHash = await hashAdminUserEmail();

    expect(testHash).toBe('');
  });

  it('should return hash using crypto subtle', async () => {
    Object.defineProperty(global.self, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn(() => testHashValue),
        },
      },
    });

    Object.defineProperty(global.self, 'TextEncoder', {
      value: TextEncoder,
    });

    const payload = {
      email: 'testemail@strapi.io',
    };

    const spy = jest.spyOn(utils, 'digestMessage');

    const testHash = await hashAdminUserEmail(payload);

    expect(spy).toHaveBeenCalled();
    expect(testHash).toBe(testHashValue);
  });

  it('should return same hash even if subtle crypto or text encoder are not available', async () => {
    const payload = {
      email: 'testemail@strapi.io',
    };

    const testHash = await hashAdminUserEmail(payload);

    expect(testHash).toBe(testHashValue);
  });
});
