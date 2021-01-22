'use strict';

jest.resetModules();

jest.mock('@sentry/node', () => {
  return {
    init() {
      console.log('MOCKING SENTRY INIT');
    },
  };
});

const sentryService = require('../sentry');
const defaultConfig = require('../../config/settings.json');

describe('test', () => {
  beforeEach(() => {
    global.strapi = {
      plugins: {
        sentry: {
          config: {
            ...defaultConfig,
            dsn: 'fakedsn',
          },
        },
      },
      log: {
        warn: jest.fn(),
        info: jest.fn(),
      },
    };
  });
  it('init', async () => {
    sentryService.init();
  });
});

// const Sentry = require('@sentry/node');
// const sentryService = require('../sentry');
// const defaultConfig = require('../../config/settings.json');

// const INVALID_DSN = 'an_invalid_dsn';
// const VALID_DSN = 'a_valid_dsn';

// describe('strapi-plugin-sentry service', () => {
//   beforeEach(() => {
//     global.strapi = {
//       plugins: {
//         sentry: {
//           config: defaultConfig,
//         },
//       },
//       log: {
//         warn: jest.fn(),
//         info: jest.fn(),
//       },
//     };
//   });

//   it('disables Sentry when no DSN is provided', () => {
//     // Sentry.init();
//     sentryService.init();
//     expect(strapi.log.info).toHaveBeenCalledWith(expect.stringMatching(/disabled/i));

//     const instance = sentryService.getInstance();
//     expect(instance).toBeNull();
//   });

//   it('disables Sentry when an invalid DSN is provided', () => {
//     global.strapi.plugins.sentry.config = {
//       dsn: INVALID_DSN,
//     };
//     sentryService.init();
//     expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not set up sentry/i));

//     const instance = sentryService.getInstance();
//     expect(instance).toBeNull();
//   });

//   it("doesn't send events before init", () => {
//     sentryService.sendError(Error());
//     expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/cannot send event/i));
//   });

//   it('initializes and sends errors', () => {
//     global.strapi.plugins.sentry.config = {
//       dsn: VALID_DSN,
//     };

//     sentryService.init();

//     // Saves the instance correctly
//     const instance = sentryService.getInstance();
//     expect(instance).not.toBeNull();

//     // Doesn't allow re-init
//     sentryService.init();
//     expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/already/i));

//     const error = Error('an error');
//     const configureScope = jest.fn();
//     sentryService.sendError(error, configureScope);
//     expect(configureScope).toHaveBeenCalled();
//   });
// });
