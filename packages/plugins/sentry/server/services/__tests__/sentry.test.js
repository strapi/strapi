'use strict';

const INVALID_DSN = 'an_invalid_dsn';
const VALID_DSN = 'a_valid_dsn';
const mockCaptureException = jest.fn();

// FIXME
/* eslint-disable import/extensions */
jest.mock('@sentry/node', () => {
  return {
    init(options = {}) {
      if (options.dsn !== VALID_DSN) {
        throw Error();
      }
    },
    captureException: mockCaptureException,
    withScope(configureScope) {
      configureScope();
    },
  };
});

const sentryServiceLoader = require('../sentry');
const defaultConfig = require('../../config').default;

describe('Sentry service', () => {
  beforeEach(() => {
    // Reset Strapi state
    global.strapi = {
      config: {
        get: () => defaultConfig,
      },
      log: {
        warn: jest.fn(),
        info: jest.fn(),
      },
    };
  });

  afterEach(() => {
    // Reset the plugin resource state
    jest.resetModules();
  });

  it('disables Sentry when no DSN is provided', () => {
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();
    expect(strapi.log.info).toHaveBeenCalledWith(expect.stringMatching(/disabled/i));

    const instance = sentryService.getInstance();
    expect(instance).toBeNull();
  });

  it('disables Sentry when an invalid DSN is provided', () => {
    global.strapi.config.get = () => ({ dsn: INVALID_DSN });
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/could not set up sentry/i));

    const instance = sentryService.getInstance();
    expect(instance).toBeNull();
  });

  it("doesn't send events before init", () => {
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.sendError(Error());
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/cannot send event/i));
  });

  it('initializes and sends errors', () => {
    global.strapi.config.get = () => ({ dsn: VALID_DSN, sendMetadata: true });
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();

    // Saves the instance correctly
    const instance = sentryService.getInstance();
    expect(instance).not.toBeNull();

    // Doesn't allow re-init
    sentryService.init();

    // Send error
    const error = Error('an error');
    const configureScope = jest.fn();
    sentryService.sendError(error, configureScope);
    expect(configureScope).toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('does not send metadata when the option is disabled', () => {
    // Init with metadata option disabled
    global.strapi.config.get = () => ({ dsn: VALID_DSN, sendMetadata: false });
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();

    // Send error
    const error = Error('an error');
    const configureScope = jest.fn();
    sentryService.sendError(error, configureScope);
    expect(configureScope).not.toHaveBeenCalled();
  });
});
