'use strict';

jest.mock('koa-passport', () => ({
  use: jest.fn(),
  initialize: jest.fn(),
}));

jest.mock('passport-local', () => {
  return {
    Strategy: class {
      constructor(options, handler) {
        this.options = options;
        this.handler = handler;
      }
    },
  };
});

const passport = require('koa-passport');

const { getPassportStrategies, init } = require('../passport');
const createLocalStrategy = require('../passport/local-strategy');

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
      };

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
      };

      const strategy = createLocalStrategy(strapi);
      const done = jest.fn();

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
      };

      const strategy = createLocalStrategy(strapi);
      const done = jest.fn();

      await strategy.handler('foo', 'bar', done);

      expect(done).toHaveBeenCalledWith(...args);
    });
  });
});
