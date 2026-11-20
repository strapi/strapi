import { describe, test, expect, vi } from 'vitest';
import passport from 'koa-passport';
import createLocalStrategy from '../passport/local-strategy';
import passportService from '../passport';

const { getPassportStrategies, init } = passportService;

vi.mock('koa-passport', async () => ({
  default: {
    use: vi.fn(),
    initialize: vi.fn(),
  },
}));

vi.mock('passport-local', async () => {
  return {
    Strategy: class {
      options: any;

      handler: any;

      constructor(options: any, handler: any) {
        this.options = options;
        this.handler = handler;
      }
    },
  };
});

describe('Passport', () => {
  describe('Init', () => {
    test('It should register the local provider in passport and init it', () => {
      const getPassportStrategiesSpy = vi.fn(getPassportStrategies);

      global.strapi = {
        config: { get: vi.fn(() => ({})) },
        admin: {
          services: {
            passport: { getPassportStrategies: getPassportStrategiesSpy, authEventsMapper: {} },
          },
        },
      } as any;

      init();

      expect(getPassportStrategiesSpy).toHaveBeenCalled();
      expect(passport.use).toHaveBeenCalledTimes(1);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });

  describe('Local Strategy', () => {
    test('It should call the callback with the error if the credentials check fails', async () => {
      global.strapi = {
        admin: {
          services: {
            auth: {
              checkCredentials: vi.fn(() => {
                return Promise.reject(new Error('Bad credentials'));
              }),
            },
          },
        },
      } as any;

      const strategy = createLocalStrategy(strapi);
      const done = vi.fn();

      // @ts-expect-error passport strategy handler accepts runtime callback args
      await strategy.handler('foo', 'bar', done);

      expect(done).toHaveBeenCalledWith(new Error('Bad credentials'));
    });

    test('It should call the callback with the profile if the credentials check succeed', async () => {
      const args = [null, { id: 'foo' }, 'bar'];
      global.strapi = {
        admin: {
          services: {
            auth: {
              checkCredentials: vi.fn(() => {
                return Promise.resolve(args);
              }),
            },
          },
        },
      } as any;

      const strategy = createLocalStrategy(strapi);
      const done = vi.fn();

      // @ts-expect-error passport strategy handler accepts runtime callback args
      await strategy.handler('foo', 'bar', done);

      expect(done).toHaveBeenCalledWith(...args);
    });
  });
});

describe('Local Strategy email normalization', () => {
  test('lower-cases the email before checking credentials', async () => {
    const checkCredentials = vi.fn(() => Promise.resolve([null, { id: 'foo' }, 'bar']));
    global.strapi = { admin: { services: { auth: { checkCredentials } } } } as any;

    const strategy = createLocalStrategy(strapi);

    // @ts-expect-error passport strategy handler accepts runtime callback args
    await strategy.handler('Admin@Example.COM', 'pwd', vi.fn());

    expect(checkCredentials).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'pwd' });
  });
});

describe('Local Strategy non-string email', () => {
  test('coerces a non-string email (JSON array body) instead of throwing', async () => {
    const checkCredentials = vi.fn(() => Promise.resolve([null, false, 'Invalid credentials']));
    global.strapi = { admin: { services: { auth: { checkCredentials } } } } as any;

    const strategy = createLocalStrategy(strapi);
    const done = vi.fn();

    // @ts-expect-error passport-local passes whatever the JSON body holds
    await strategy.handler(['Admin@Example.COM'], 'pwd', done);

    expect(checkCredentials).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'pwd' });
    expect(done).toHaveBeenCalledWith(null, false, 'Invalid credentials');
  });
});
