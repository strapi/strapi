import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import sentryServiceLoader from '../sentry';
import defaultConfig from '../../config';

const { captureException, INVALID_DSN, VALID_DSN } = vi.hoisted(() => ({
  captureException: vi.fn(),
  INVALID_DSN: 'an_invalid_dsn',
  VALID_DSN: 'a_valid_dsn',
}));

vi.mock('@sentry/node', () => {
  return {
    init(options: { dsn?: string } = {}) {
      if (options.dsn !== VALID_DSN) {
        throw Error('invalid dsn');
      }
    },
    captureException,
    withScope(configureScope: () => void) {
      configureScope();
    },
  };
});

describe('Sentry service', () => {
  beforeEach(() => {
    captureException.mockClear();

    // Reset Strapi state
    global.strapi = {
      config: {
        // @ts-expect-error - ignore the generic type
        get: () => defaultConfig,
        set: vi.fn(),
        has: vi.fn(),
      },
      // @ts-expect-error - we only need a subset of the strapi log object
      log: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    };
  });

  afterEach(() => {
    // Reset the plugin resource state
    vi.resetModules();
  });

  it('disables Sentry when no DSN is provided', () => {
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();
    expect(strapi.log.info).toHaveBeenCalledWith(expect.stringMatching(/disabled/i));

    const instance = sentryService.getInstance();
    expect(instance).toBeNull();
  });

  it('disables Sentry when an invalid DSN is provided', () => {
    // @ts-expect-error - ignore the generic type
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
    // @ts-expect-error - ignore the generic type
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
    const configureScope = vi.fn();
    sentryService.sendError(error, configureScope);
    expect(configureScope).toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
  });

  it('does not send metadata when the option is disabled', () => {
    // Init with metadata option disabled
    // @ts-expect-error - ignore the generic type
    global.strapi.config.get = () => ({ dsn: VALID_DSN, sendMetadata: false });
    const sentryService = sentryServiceLoader({ strapi });
    sentryService.init();

    // Send error
    const error = Error('an error');
    const configureScope = vi.fn();
    sentryService.sendError(error, configureScope);
    expect(configureScope).not.toHaveBeenCalled();
  });
});
