'use strict';

jest.mock('koa-passport', () => ({
  use: jest.fn(),
  initialize: jest.fn(),
}));

const passport = require('koa-passport');

const { init } = require('../../../services/passport');

describe('Passport', () => {
  afterEach(() => {
    // Reset the mock on passport.use.toHaveBeenCalledTimes
    jest.resetAllMocks();
    // Reset the mock on strapi/lib/utils/ee so we can change its behavior
    jest.resetModules();
  });

  describe('Init (SSO disabled)', () => {
    beforeAll(() => {
      jest.mock('strapi/lib/utils/ee', () => ({
        features: {
          // Disable the SSO feature
          isEnabled: feature => feature !== 'sso',
        },
      }));
    });

    test('It should register the local provider in passport and init it', () => {
      const createStrategy = jest.fn(() => ({ foo: 'bar' }));
      const { getPassportStrategies } = require('../passport');

      global.strapi = {
        admin: {
          services: {
            passport: { getPassportStrategies },
          },
        },
        config: {
          get: () => ({
            providers: [
              // Since SSO is disabled here, those strategies should be ignored
              { uid: 'foo', createStrategy },
              { uid: 'bar', createStrategy },
            ],
          }),
        },
      };

      init();

      expect(passport.use).toHaveBeenCalledTimes(1);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });

  describe('Init (SSO enabled)', () => {
    beforeAll(() => {
      jest.mock('strapi/lib/utils/ee', () => ({
        features: {
          // Enable all the features (including SSO)
          isEnabled: () => true,
        },
      }));
    });

    test('It should register all providers in passport and init them', () => {
      const createStrategy = jest.fn(() => ({ foo: 'bar' }));
      const { getPassportStrategies } = require('../passport');

      global.strapi = {
        admin: {
          services: {
            passport: { getPassportStrategies },
          },
        },
        config: {
          get: () => ({
            providers: [
              // Since SSO is enabled, those strategies should be registered
              { uid: 'foo', createStrategy },
              { uid: 'bar', createStrategy },
            ],
          }),
        },
      };

      init();

      expect(passport.use).toHaveBeenCalledTimes(3);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });
});
