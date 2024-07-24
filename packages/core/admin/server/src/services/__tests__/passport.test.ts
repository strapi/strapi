import passport from 'koa-passport';
import createLocalStrategy from '../passport/local-strategy';
import passportService from '../passport';

const { getPassportStrategies, init } = passportService;

jest.mock('koa-passport', () => ({
  use: jest.fn(),
  initialize: jest.fn(),
}));

jest.mock('passport-local', () => {
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
      const getPassportStrategiesSpy = jest.fn(getPassportStrategies);

      global.strapi = {
        config: { get: jest.fn(() => ({})) },
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
              checkCredentials: jest.fn(() => {
                return Promise.reject(new Error('Bad credentials'));
              }),
            },
          },
        },
      } as any;

      const strategy = createLocalStrategy(strapi);
      const done = jest.fn();

      // @ts-expect-error
      await strategy.handler('foo', 'bar', done);

      expect(done).toHaveBeenCalledWith(new Error('Bad credentials'));
    });

    test('It should call the callback with the profile if the credentials check succeed', async () => {
      const args = [null, { id: 'foo' }, 'bar'];
      global.strapi = {
        admin: {
          services: {
            auth: {
              checkCredentials: jest.fn(() => {
                return Promise.resolve(args);
              }),
            },
          },
        },
      } as any;

      const strategy = createLocalStrategy(strapi);
      const done = jest.fn();

      // @ts-expect-error
      await strategy.handler('foo', 'bar', done);

      expect(done).toHaveBeenCalledWith(...args);
    });
  });
});
