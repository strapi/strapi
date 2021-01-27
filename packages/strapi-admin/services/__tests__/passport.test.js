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

describe('Passport', () => {
  describe('Init', () => {
    test('It should register the local provider in passport and init it', () => {
      const getPassportStrategiesSpy = jest.fn(getPassportStrategies);

      global.strapi = {
        admin: {
          services: {
            passport: { getPassportStrategies: getPassportStrategiesSpy },
          },
        },
      };

      init();

      expect(getPassportStrategiesSpy).toHaveBeenCalled();
      expect(passport.use).toHaveBeenCalledTimes(1);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });
});
