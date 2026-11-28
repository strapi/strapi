import { describe, expect, it, vi } from 'vitest';

import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import { emptyStartupInputs, fingerprint, readStartupInputs } from '../startup-inputs';
import type { StartupInputs } from '../startup-inputs';

const withSecret = (clientSecret: string): StartupInputs => ({
  requireEmailVerification: true,
  providers: {
    socialProviders: { github: { clientId: 'the-client-id', clientSecret } },
    genericOAuth: [{ providerId: 'acme', clientId: 'acme-id', clientSecret }],
    trustedProviders: ['github'],
  },
});

describe('fingerprint', () => {
  it('never holds a provider secret', () => {
    const text = fingerprint(withSecret('s3cr3t-value'));

    expect(text).not.toContain('s3cr3t-value');
    expect(text).toContain('the-client-id');
    expect(text).toContain('sha256:');
  });

  it('changes when a secret changes, and not otherwise', () => {
    expect(fingerprint(withSecret('a'))).toBe(fingerprint(withSecret('a')));
    expect(fingerprint(withSecret('a'))).not.toBe(fingerprint(withSecret('b')));
    expect(fingerprint(emptyStartupInputs())).not.toBe(fingerprint(withSecret('a')));
  });

  it('hashes a field the definition declares secret, whatever it is called', () => {
    const inputs = (certificate: string, secrets?: { fields: string[]; values: string[] }) =>
      ({
        ...emptyStartupInputs(),
        providers: {
          socialProviders: {},
          genericOAuth: [{ providerId: 'acme', certificate, renamed: certificate }],
          trustedProviders: [],
          ...(secrets ? { secrets } : {}),
        },
      }) as StartupInputs;

    // By its name alone, nothing marks it
    expect(fingerprint(inputs('PEM-BODY'))).toContain('PEM-BODY');

    const declared = { fields: ['certificate'], values: ['PEM-BODY'] };
    const text = fingerprint(inputs('PEM-BODY', declared));

    expect(text).not.toContain('PEM-BODY');
    expect(text).toContain('sha256:');
    expect(fingerprint(inputs('PEM-A', { fields: ['certificate'], values: ['PEM-A'] }))).not.toBe(
      fingerprint(inputs('PEM-B', { fields: ['certificate'], values: ['PEM-B'] }))
    );
  });

  it('does not depend on key order', () => {
    const one: StartupInputs = {
      ...emptyStartupInputs(),
      providers: {
        socialProviders: { a: { x: 1, y: 2 }, b: {} },
        genericOAuth: [],
        trustedProviders: [],
      },
    };
    const other: StartupInputs = {
      ...emptyStartupInputs(),
      providers: {
        socialProviders: { b: {}, a: { y: 2, x: 1 } },
        genericOAuth: [],
        trustedProviders: [],
      },
    };

    expect(fingerprint(one)).toBe(fingerprint(other));
  });
});

describe('readStartupInputs', () => {
  const providers = {
    socialProviders: { github: { clientId: 'id', clientSecret: 'secret' } },
    genericOAuth: [{ providerId: 'acme' }],
    trustedProviders: ['acme'],
  };

  const strapiWith = (requireEmailVerification: boolean) => {
    const get = vi.fn(async () => ({ signUp: { requireEmailVerification } }));
    const options = vi.fn(async () => providers);
    const service = vi.fn((name: string) => (name === 'provider' ? { options } : { get }));
    const plugin = vi.fn(() => ({ service }));

    return { strapi: { plugin } as unknown as Core.Strapi, plugin, service, get, options };
  };

  it.each([true, false])(
    'reads requireEmailVerification (%s) from the settings and the providers from the provider service',
    async (value) => {
      const { strapi, plugin, service } = strapiWith(value);

      expect(await readStartupInputs(strapi)).toEqual({
        requireEmailVerification: value,
        providers,
      });
      expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
      expect(service).toHaveBeenCalledWith('settings');
      expect(service).toHaveBeenCalledWith('provider');
    }
  );

  it('changes the fingerprint when the setting changes, so the engine is rebuilt', async () => {
    const off = fingerprint(await readStartupInputs(strapiWith(false).strapi));
    const on = fingerprint(await readStartupInputs(strapiWith(true).strapi));

    expect(on).not.toBe(off);
  });
});
