import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { bootstrap } from '../bootstrap';

vi.mock('@strapi/provider-email-sendmail', () => ({
  default: {
    init() {
      return { send: vi.fn() };
    },
  },
}));

const createStrapiMock = (provider: unknown = 'sendmail') => {
  const warn = vi.fn();
  const set = vi.fn();
  const registerMany = vi.fn().mockResolvedValue(undefined);
  const emailPlugin = { provider: undefined as unknown };

  const strapi = {
    config: {
      get: vi.fn().mockReturnValue({
        provider,
        providerOptions: {},
        settings: { defaultFrom: 'Strapi <no-reply@strapi.io>' },
      }),
      set,
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

  return { strapi, warn, set, registerMany, emailPlugin };
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

    const guidance = expect.stringContaining(
      '[email]: The "sendmail" email provider is still supported'
    );

    if (shouldWarn) {
      expect(warn).toHaveBeenCalledWith(guidance);
    } else {
      expect(warn).not.toHaveBeenCalledWith(guidance);
    }
  });

  it('does not log sendmail migration guidance for other providers in development', async () => {
    process.env.NODE_ENV = 'development';
    const module = { name: 'nodemailer', init: vi.fn().mockReturnValue({ send: vi.fn() }) };
    const { strapi, warn } = createStrapiMock(module);

    await bootstrap({ strapi });

    expect(warn).not.toHaveBeenCalled();
  });

  describe('provider', () => {
    const settings = { defaultFrom: 'Strapi <no-reply@strapi.io>' };

    it('uses an imported provider module and stores its name in the config', async () => {
      const provider = { send: vi.fn() };
      const module = { name: 'custom', init: vi.fn().mockReturnValue(provider) };
      const { strapi, warn, set, emailPlugin } = createStrapiMock(module);

      await bootstrap({ strapi });

      expect(module.init).toHaveBeenCalledWith({}, settings);
      expect(emailPlugin.provider).toBe(provider);
      expect(set).toHaveBeenCalledWith('plugin::email.provider', 'custom');
      expect(warn).not.toHaveBeenCalled();
    });

    it('unwraps a provider module imported with its namespace object', async () => {
      const module = { name: 'custom', init: vi.fn().mockReturnValue({ send: vi.fn() }) };
      const { strapi, set } = createStrapiMock({ default: module });

      await bootstrap({ strapi });

      expect(module.init).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith('plugin::email.provider', 'custom');
    });

    it('throws when an imported provider module has no name', async () => {
      const { strapi } = createStrapiMock({ init: vi.fn() });

      await expect(bootstrap({ strapi })).rejects.toThrow(/has no "name"/);
    });

    it('throws when the provider is neither a name nor a provider module', async () => {
      const { strapi } = createStrapiMock({ foo: 'bar' });

      await expect(bootstrap({ strapi })).rejects.toThrow(/is not a provider module/);
    });

    it('warns for the default sendmail provider, which will be removed', async () => {
      process.env.NODE_ENV = 'production';
      const { strapi, warn, set } = createStrapiMock('Sendmail');

      await bootstrap({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::email.provider', 'sendmail');
      expect(warn).toHaveBeenCalledWith(
        'The email provider "sendmail" is resolved by name, which will be removed in the next major. Add "@strapi/provider-email-sendmail" to your dependencies and import it as `provider` in config/plugins instead.'
      );
    });

    // Resolved relative to bootstrap.ts
    const fixture = (name: string) => `./__tests__/resources/${name}`;

    it('warns when a provider resolved by name has no name', async () => {
      const { strapi, set, warn } = createStrapiMock(fixture('unnamed-provider'));

      await bootstrap({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::email.provider', fixture('unnamed-provider'));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('doesn\'t export a "name". Its package must add one')
      );
    });

    it('warns and keeps the configured name when a provider exports another name', async () => {
      const { strapi, set, warn } = createStrapiMock(fixture('renamed-provider'));

      await bootstrap({ strapi });

      expect(set).toHaveBeenCalledWith('plugin::email.provider', fixture('renamed-provider'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('exports the name "other-name"'));
    });

    it('warns when a provider is resolved by name', async () => {
      const { strapi, warn } = createStrapiMock('not-installed-provider');

      await expect(bootstrap({ strapi })).rejects.toThrow(
        'Could not load email provider "not-installed-provider".'
      );
      expect(warn).toHaveBeenCalledWith(
        'The email provider "not-installed-provider" is resolved by name, which will be removed in the next major. Import the provider as `provider` in config/plugins instead.'
      );
    });
  });
});
