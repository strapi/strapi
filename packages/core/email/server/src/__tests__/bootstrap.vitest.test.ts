import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { bootstrap } from '../bootstrap';

vi.mock('@strapi/provider-email-sendmail', () => ({
  init() {
    return { send: vi.fn() };
  },
}));

const createStrapiMock = (provider = 'sendmail') => {
  const warn = vi.fn();
  const registerMany = vi.fn().mockResolvedValue(undefined);
  const emailPlugin = { provider: undefined as unknown };

  const strapi = {
    config: {
      get: vi.fn().mockReturnValue({
        provider,
        providerOptions: {},
        settings: { defaultFrom: 'Strapi <no-reply@strapi.io>' },
      }),
    },
    log: { warn },
    plugin: vi.fn((name: string) => {
      if (name === 'email') {
        return emailPlugin;
      }
      return {};
    }),
    service: vi.fn(() => ({
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
