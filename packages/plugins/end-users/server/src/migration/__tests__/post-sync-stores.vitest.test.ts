import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import * as records from '../record';
import { storesStep } from '../post-sync-stores';

vi.mock('../record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../record')>()),
  claimMigration: vi.fn().mockResolvedValue(true),
  addReportItems: vi.fn(),
}));

const OWNER = 'start-1';
const SECRET = ['s', 'e', 'c', 'r', 'e', 't'].join('-');

interface Setup {
  grant?: Record<string, unknown>;
  email?: Record<string, unknown>;
  advanced?: Record<string, unknown>;
  update?: ReturnType<typeof vi.fn>;
  provider?: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
  encrypt?: (value: string) => string | null;
}

const strapiWith = (setup: Setup) => {
  const upStore: Record<string, unknown> = {
    grant: setup.grant,
    email: setup.email,
    advanced: setup.advanced,
  };
  const settings = {
    set: setup.set ?? vi.fn(),
    signUpFields: () => [],
  };
  const services: Record<string, unknown> = {
    settings,
    provider: { update: setup.provider ?? vi.fn() },
    engine: { get: () => ({ isTrustedOrigin: async () => true }) },
  };

  return {
    log: { info: vi.fn(), warn: vi.fn() },
    config: { get: () => undefined },
    contentTypes: { 'plugin::end-users.profile': { attributes: {} } },
    store: () => ({ get: async ({ key }: { key: string }) => upStore[key] ?? null }),
    service: () => ({ encrypt: setup.encrypt ?? ((value: string) => `enc:${value}`) }),
    plugin: (name: string) => ({
      provider: {},
      service: (service: string) =>
        name === 'email' ? { update: setup.update ?? vi.fn() } : services[service],
    }),
  } as unknown as Core.Strapi;
};

const record = { carried: { defaultRoleDocumentId: null } } as never;
const itemsAdded = () => vi.mocked(records.addReportItems).mock.calls[0][1];

describe('storesStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('turns a template the email plugin refuses into an item, and logs the reason without the body', async () => {
    const update = vi
      .fn()
      .mockRejectedValue(new Error('The HTML puts {{ url }} where it could leak'));
    const strapi = strapiWith({
      update,
      email: {
        reset_password: {
          options: { object: 'Hello', message: '<p>Body text <%= URL %>?code=<%= TOKEN %></p>' },
        },
      },
    });

    await storesStep.run(strapi, record, OWNER);

    expect(itemsAdded()).toEqual([
      expect.objectContaining({ id: 'template-untranslated:end-users.reset-password' }),
    ]);
    expect(vi.mocked(strapi.log.warn).mock.calls[0][0]).toContain('could leak');
    expect(vi.mocked(strapi.log.warn).mock.calls[0][0]).not.toContain('Body text');
  });

  it('keeps a provider the service refuses off, with the values it held and never its secret', async () => {
    const provider = vi.fn().mockRejectedValue(new Error('clientId is missing'));
    const strapi = strapiWith({
      provider,
      grant: {
        auth0: { enabled: true, subdomain: 'tenant', scope: ['openid'] },
        github: { enabled: true, key: 'gh-client', secret: SECRET },
      },
    });

    await storesStep.run(strapi, record, OWNER);

    const [auth0, github] = itemsAdded();

    expect(auth0).toMatchObject({
      id: 'provider-needs-input:auth0',
      refs: ['clientId', 'clientSecret'],
    });
    expect(auth0.message).toContain('domain: tenant.auth0.com');
    expect(auth0.message).toContain('scopes: openid');
    expect(github.id).toBe('provider-needs-input:github');
    expect(github.message).toContain('clientId: gh-client');
    expect(JSON.stringify(itemsAdded())).not.toContain(SECRET);
  });

  it('lists a provider with a secret but no encryption key, without writing it', async () => {
    const provider = vi.fn();
    const strapi = strapiWith({
      provider,
      encrypt: () => null,
      grant: { github: { enabled: true, key: 'gh-client', secret: SECRET } },
    });

    await storesStep.run(strapi, record, OWNER);

    expect(provider).not.toHaveBeenCalled();
    expect(itemsAdded()[0]).toMatchObject({ id: 'provider-needs-input:github' });
    expect(JSON.stringify(itemsAdded())).not.toContain(SECRET);
  });

  it('turns settings the service refuses into an item instead of stopping the start', async () => {
    const set = vi.fn().mockRejectedValue(
      new errors.ValidationError('bad', {
        errors: [{ path: ['redirects', 'emailVerified'], message: 'bad', name: 'ValidationError' }],
      })
    );
    const strapi = strapiWith({ set, advanced: { allow_register: true } });

    await storesStep.run(strapi, record, OWNER);

    expect(itemsAdded()).toEqual([
      expect.objectContaining({
        id: 'compat-note:settings-not-saved',
        refs: ['redirects.emailVerified'],
      }),
    ]);
  });

  it('writes the same on a second run', async () => {
    const provider = vi.fn();
    const set = vi.fn();
    const strapi = strapiWith({
      provider,
      set,
      advanced: { allow_register: true },
      grant: { github: { enabled: true, key: 'gh-client', secret: SECRET } },
    });

    await storesStep.run(strapi, record, OWNER);
    await storesStep.run(strapi, record, OWNER);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[1]).toEqual(set.mock.calls[0]);
    expect(provider.mock.calls[1]).toEqual(provider.mock.calls[0]);
  });
});
