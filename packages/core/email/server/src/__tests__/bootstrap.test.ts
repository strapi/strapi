import type { Core } from '@strapi/types';

import { bootstrap } from '../bootstrap';

jest.mock('@strapi/provider-email-sendmail', () => ({
  init() {
    return { send: jest.fn() };
  },
}));

const createStrapiMock = (provider = 'sendmail') => {
  const warn = jest.fn();
  const registerMany = jest.fn().mockResolvedValue(undefined);
  const emailPlugin = { provider: undefined as unknown };

  const strapi = {
    config: {
      get: jest.fn().mockReturnValue({
        provider,
        providerOptions: {},
        settings: { defaultFrom: 'Strapi <no-reply@strapi.io>' },
      }),
    },
    log: { warn },
    plugin: jest.fn((name: string) => {
      if (name === 'email') {
        return emailPlugin;
      }
      return {};
    }),
    service: jest.fn(() => ({
      actionProvider: { registerMany },
    })),
  } as unknown as Core.Strapi;

  return { strapi, warn, registerMany, emailPlugin };
};

describe('Email plugin bootstrap', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it.each([
    ['development', true],
    ['test', false],
    ['production', false],
  ])('logs sendmail migration guidance when NODE_ENV is %s: %s', async (nodeEnv, shouldWarn) => {
    process.env.NODE_ENV = nodeEnv;
    const { strapi, warn } = createStrapiMock();

    await bootstrap({ strapi });

    if (shouldWarn) {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[email]: The "sendmail" email provider is still supported')
      );
    } else {
      expect(warn).not.toHaveBeenCalled();
    }
  });

  it('does not log sendmail migration guidance for other providers in development', async () => {
    process.env.NODE_ENV = 'development';
    const { strapi, warn } = createStrapiMock('nodemailer');

    await bootstrap({ strapi });

    expect(warn).not.toHaveBeenCalled();
  });
});
