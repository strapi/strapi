jest.mock('koa-passport', () => ({
  use: jest.fn(),
  initialize: jest.fn(),
}));

import passport from 'koa-passport';

let ssoEnabled = true;

import passportService from '../../../../../server/src/services/passport';
import eePassportService from '../passport';

const { init } = passportService;

describe('Passport', () => {
  beforeAll(() => {
    global.strapi = {
      ee: {
        features: {
          isEnabled: jest.fn(() => {
            return ssoEnabled;
          }),
        },
      },
    } as any;
  });

  afterEach(() => {
    // Reset the mock on passport.use.toHaveBeenCalledTimes
    jest.clearAllMocks();
    // Reset the mock on strapi/ee so we can change its behavior
    jest.resetModules();
  });

  describe('Init (SSO disabled)', () => {
    beforeAll(() => {
      ssoEnabled = false;
    });

    test('It should register the local provider in passport and init it', () => {
      const createStrategy = jest.fn(() => ({ foo: 'bar' }));
      const { getPassportStrategies } = eePassportService;

      global.strapi = {
        ...global.strapi,
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
      } as any;

      init();

      expect(passport.use).toHaveBeenCalledTimes(1);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });

  describe('Init (SSO enabled)', () => {
    beforeAll(() => {
      ssoEnabled = true;
    });

    test('It should register all providers in passport and init them', () => {
      const createStrategy = jest.fn(() => ({ foo: 'bar' }));
      const { getPassportStrategies } = eePassportService;

      global.strapi = {
        ...global.strapi,
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
      } as any;

      init();

      expect(passport.use).toHaveBeenCalledTimes(3);
      expect(passport.initialize).toHaveBeenCalled();
    });
  });
});
