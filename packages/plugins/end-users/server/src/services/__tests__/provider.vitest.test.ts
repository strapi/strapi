import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PERMISSIONS_TTL_MS } from '../ability';
import { BUILT_IN_PROVIDERS } from '../../providers/built-in';
import { createDefinition } from '../../providers/define-provider';
import { DISCOVERY_TIMEOUT_MS } from '../../providers/discovery';
import type { ProviderDefinition } from '../../providers/define-provider';
import type { ConfiguredProvider } from '../../providers/registry';
import providerService from '../provider';

const SECRET = 'TOP-SECRET-VALUE';
const KEY_SECRET = 'PRIVATE-KEY-VALUE';

const github = BUILT_IN_PROVIDERS.find(
  (definition) => definition.id === 'github'
) as ProviderDefinition;

/** A provider a package brought: a required URL, and a secret field of its own. */
const acme = createDefinition('oauth', {
  id: 'acme',
  name: 'Acme',
  fields: {
    issuer: { type: 'url', label: 'Issuer', required: true },
    signingKey: { type: 'secret', label: 'Signing key' },
  },
  defaultScopes: ['openid'],
  init: ({ clientId, clientSecret, scopes, issuer, signingKey }) => ({
    discoveryUrl: `${String(issuer)}/.well-known/openid-configuration`,
    clientId,
    clientSecret,
    scopes,
    signingKey,
  }),
});

const registryState: { configured: ConfiguredProvider[]; extra: ProviderDefinition[] } = {
  configured: [],
  extra: [],
};

vi.mock('../../providers/registry', () => ({
  registry() {
    const all = () => [github, acme, ...registryState.extra];

    return {
      available: all,
      fromConfig: () => registryState.configured,
      get: (id: string) => all().find((definition) => definition.id === id),
      packageOf: (id: string) => (id === 'acme' ? 'acme-idp' : null),
    };
  },
}));

const DISCOVERY_DOCUMENT = {
  issuer: 'https://idp.example.com',
  authorization_endpoint: 'https://idp.example.com/authorize',
  token_endpoint: 'https://idp.example.com/token',
};

/**
 * The hosts the tests name (`*.example.com`) answer with a discovery document; any other address
 * goes to the real network stack, so a test can point at a server of its own.
 */
/** Whether a request goes to a host under example.com, judged by its parsed host name */
const isExampleHost = (input: Parameters<typeof fetch>[0]) => {
  try {
    return new URL(String(input)).hostname.endsWith('.example.com');
  } catch {
    return false;
  }
};

const stubDiscoveryHosts = () => {
  const realFetch = globalThis.fetch;

  vi.stubGlobal(
    'fetch',
    vi.fn((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      isExampleHost(input)
        ? Promise.resolve(Response.json(DISCOVERY_DOCUMENT))
        : realFetch(input, init)
    )
  );
};

interface SetupOptions {
  stored?: Record<string, unknown>;
  encryptionKey?: boolean;
}

const setup = ({ stored, encryptionKey = true }: SetupOptions = {}) => {
  const values = new Map<string, unknown>(stored ? [['providers', stored]] : []);
  let keyChanged = false;

  const get = vi.fn(async ({ key }: { key: string }) => values.get(key) ?? null);
  const set = vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
    values.set(key, structuredClone(value));
  });
  const del = vi.fn(async ({ key }: { key: string }) => {
    values.delete(key);
  });
  const encryption = {
    encrypt: vi.fn((value: string) =>
      encryptionKey ? `v1:${Buffer.from(value).toString('hex')}` : null
    ),
    decrypt: vi.fn((value: string) =>
      keyChanged ? null : Buffer.from(value.replace(/^v1:/, ''), 'hex').toString()
    ),
  };
  const reload = vi.fn(async () => undefined);
  const log = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  const config: Record<string, unknown> = {
    'server.url': 'https://app.example.com',
    'api.rest.prefix': '/api',
  };

  const strapi = {
    log,
    store: vi.fn(() => ({ get, set, delete: del })),
    service: vi.fn(() => encryption),
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ reload })) })),
    config: { get: (key: string) => config[key] },
  } as unknown as Core.Strapi;

  return {
    service: providerService({ strapi }),
    values,
    get,
    set,
    del,
    encryption,
    reload,
    log,
    breakKey() {
      keyChanged = true;
    },
  };
};

const saveGithub = { clientId: 'gh-id', clientSecret: SECRET };

const everything = (value: unknown) => JSON.stringify(value);

const refusal = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    return error as Error & { name: string };
  }

  throw new Error('expected the call to be refused');
};

describe('provider service', () => {
  beforeEach(() => {
    registryState.configured = [];
    registryState.extra = [];
    stubDiscoveryHosts();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('listing', () => {
    it('lists every available provider, disabled until one is saved, with its redirect URI', async () => {
      const { service } = setup();
      const list = await service.list();

      expect(list.map((one) => one.id)).toEqual(['github', 'acme']);
      expect(list[0]).toEqual({
        id: 'github',
        name: 'GitHub',
        kind: 'social',
        source: 'admin',
        package: null,
        enabled: false,
        status: 'disabled',
        configured: false,
        redirectUri: 'https://app.example.com/api/auth/callback/github',
      });
      expect(list[1]).toMatchObject({ kind: 'oidc', package: 'acme-idp' });
    });

    it('lists providers set in config/plugins.ts as source config, read-only', async () => {
      registryState.configured = [
        {
          definition: github,
          options: { clientId: 'cfg-id', clientSecret: SECRET },
          enabled: true,
        },
      ];

      const { service } = setup();
      const [first] = await service.list();
      const detail = await service.get('github');

      expect(first).toMatchObject({
        id: 'github',
        source: 'config',
        enabled: true,
        status: 'ready',
      });
      expect(detail).toMatchObject({ clientId: 'cfg-id', clientSecretSet: true });
      expect(everything(detail)).not.toContain(SECRET);
    });

    it('config wins over a stored entry for the same id, and keeps the stored entry', async () => {
      const { service, values } = setup();

      await service.update('github', saveGithub);

      registryState.configured = [
        {
          definition: github,
          options: { clientId: 'cfg-id', clientSecret: 'cfg-secret' },
          enabled: true,
        },
      ];

      const stored = structuredClone(values.get('providers'));
      const detail = await service.get('github');

      expect(detail).toMatchObject({ source: 'config', clientId: 'cfg-id' });
      expect((await service.options()).socialProviders.github).toMatchObject({
        clientId: 'cfg-id',
      });
      expect(values.get('providers')).toEqual(stored);
    });
  });

  describe('saving', () => {
    it('never returns the client secret, only clientSecretSet', async () => {
      const { service } = setup();
      const saved = await service.update('github', saveGithub);

      expect(saved).toMatchObject({ clientId: 'gh-id', clientSecretSet: true, status: 'ready' });
      expect(everything(saved)).not.toContain(SECRET);
      expect(everything(await service.get('github'))).not.toContain(SECRET);
      expect(everything(await service.list())).not.toContain(SECRET);
      expect(saved).not.toHaveProperty('clientSecret');
    });

    it('encrypts secret fields and returns only whether each is set', async () => {
      const { service, values } = setup();
      const saved = await service.update('acme', {
        clientId: 'acme-id',
        clientSecret: SECRET,
        fields: { issuer: 'https://idp.example.com', signingKey: KEY_SECRET },
      });

      expect(saved.fields).toEqual({
        issuer: 'https://idp.example.com',
        signingKey: { set: true },
      });
      expect(everything(saved)).not.toContain(KEY_SECRET);

      const stored = everything(values.get('providers'));

      expect(stored).not.toContain(SECRET);
      expect(stored).not.toContain(KEY_SECRET);
      expect(stored).toContain('https://idp.example.com');
    });

    it('keeps a secret that is left out, or sent back as { set: true }', async () => {
      const { service, encryption } = setup();

      await service.update('github', saveGithub);
      encryption.encrypt.mockClear();

      await service.update('github', { clientId: 'renamed', clientSecret: { set: true } });
      await service.update('github', { scopes: ['read:user'] });

      expect(encryption.encrypt).not.toHaveBeenCalled();
      expect((await service.options()).socialProviders.github).toMatchObject({
        clientId: 'renamed',
        clientSecret: SECRET,
        scope: ['read:user'],
      });
    });

    it('refuses a save that misses a required field, naming it', async () => {
      const { service, set } = setup();
      const error = await refusal(
        service.update('acme', { clientId: 'acme-id', clientSecret: SECRET })
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toContain('issuer');
      expect(error.message).not.toContain(SECRET);
      expect(set).not.toHaveBeenCalled();
    });

    it('refuses to store a secret without an encryption key', async () => {
      const { service, set } = setup({ encryptionKey: false });
      const error = await refusal(service.update('github', saveGithub));

      expect(error.name).toBe('ValidationError');
      expect(error.message).toContain('admin.secrets.encryptionKey');
      expect(error.message).not.toContain(SECRET);
      expect(set).not.toHaveBeenCalled();
    });

    it('refuses what is not a field of the provider, and a wrongly typed secret, without echoing it', async () => {
      const { service } = setup();

      expect(
        (await refusal(service.update('github', { ...saveGithub, nope: 1 } as never))).message
      ).toContain('nope');
      expect(
        (await refusal(service.update('github', { ...saveGithub, fields: { other: 'x' } }))).message
      ).toContain('other');

      const wrong = await refusal(
        service.update('acme', {
          clientId: 'id',
          clientSecret: SECRET,
          fields: { issuer: 'https://idp.example.com', signingKey: 123456789 as never },
        })
      );

      expect(wrong.message).not.toContain('123456789');
    });

    it('refuses an unknown provider with a 404', async () => {
      const { service } = setup();

      expect((await refusal(service.update('nope', saveGithub))).name).toBe('NotFoundError');
    });
  });

  describe('status', () => {
    it('marks a provider needs-secret when the secret no longer decrypts', async () => {
      const { service, breakKey, log } = setup();

      await service.update('github', saveGithub);
      breakKey();

      // the cache of a save on this server is cleared, so the next read sees the broken key
      expect((await service.list())[0].status).toBe('needs-secret');
      expect((await service.options()).socialProviders).toEqual({});
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('"github"'));
      expect(everything(log.warn.mock.calls)).not.toContain(SECRET);
    });
  });

  describe('config/plugins.ts providers are locked', () => {
    it('refuses to update or delete a provider configured in config/plugins.ts, naming it', async () => {
      registryState.configured = [
        { definition: github, options: { clientId: 'cfg-id', clientSecret: 'cfg' }, enabled: true },
      ];

      const { service, set } = setup();
      const update = await refusal(service.update('github', saveGithub));
      const remove = await refusal(service.delete('github'));

      for (const error of [update, remove]) {
        expect(error.name).toBe('ValidationError');
        expect(error.message).toContain('config/plugins.ts');
      }

      expect(set).not.toHaveBeenCalled();
    });
  });

  describe('reloading the engine', () => {
    it('reloads on every write', async () => {
      const { service, reload } = setup();

      await service.update('github', saveGithub);
      await service.delete('github');

      expect(reload).toHaveBeenCalledTimes(2);
    });

    it('rolls back the stored change when the reload fails', async () => {
      const { service, reload, values } = setup();

      await service.update('github', saveGithub);

      const before = structuredClone(values.get('providers'));

      reload.mockRejectedValueOnce(new Error(`bad discovery, secret was ${SECRET}`));

      const error = await refusal(service.update('github', { clientId: 'changed' }));

      expect(error.name).toBe('ValidationError');
      expect(error.message).not.toContain(SECRET);
      expect(values.get('providers')).toEqual(before);
      expect((await service.get('github')).clientId).toBe('gh-id');
    });

    it('answers a failed rebuild with a fixed message and logs the scrubbed reason (P4 item 4)', async () => {
      const { service, reload, log } = setup();

      reload.mockRejectedValueOnce(
        new Error(`<html>fetched page body</html> with ${SECRET} and a-short-one`)
      );

      const error = await refusal(service.update('github', saveGithub));

      expect(error.message).toBe(
        'The provider "github" was not saved: the sign-in engine could not be rebuilt with it.'
      );
      expect(everything(error)).not.toContain('fetched page body');
      expect(log.error).toHaveBeenCalledTimes(1);

      const logged = String(log.error.mock.calls[0][0]);

      expect(logged).toContain('fetched page body');
      expect(logged).not.toContain(SECRET);
    });

    it('does not garble a log line with a short secret', async () => {
      const { service, reload, log } = setup();

      reload.mockRejectedValueOnce(new Error('a bad address'));

      await refusal(service.update('github', { clientId: 'gh-id', clientSecret: 'a' }));

      expect(String(log.error.mock.calls[0][0])).toContain('a bad address');
    });

    it('removes the document again when the very first save fails to reload', async () => {
      const { service, reload, values } = setup();

      reload.mockRejectedValueOnce(new Error('nope'));

      await refusal(service.update('github', saveGithub));

      expect(values.has('providers')).toBe(false);
    });
  });

  describe('what a save needs beyond the plain update', () => {
    it('is nothing for a built-in provider whose body leaves trust for linking alone', async () => {
      const { service } = setup();

      expect(await service.needsCustomAccess('github', saveGithub)).toBe(false);
      // Resending the stored value (a form always sends it) changes nothing
      expect(
        await service.needsCustomAccess('github', { ...saveGithub, trustForLinking: false })
      ).toBe(false);
    });

    it('is needed to turn trust for linking on, and to turn it off again', async () => {
      const { service } = setup();

      expect(await service.needsCustomAccess('github', { trustForLinking: true })).toBe(true);

      await service.update('github', { ...saveGithub, trustForLinking: true });

      expect(await service.needsCustomAccess('github', { trustForLinking: false })).toBe(true);
      expect(await service.needsCustomAccess('github', { trustForLinking: true })).toBe(false);
    });

    it('is needed for any save of a custom provider', async () => {
      const { service } = setup();

      await service.create({
        name: 'My IdP',
        discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
        clientId: 'oidc-id',
        clientSecret: SECRET,
      });

      expect(await service.needsCustomAccess('my-idp', { enabled: false })).toBe(true);
    });

    it('answers 404 for a provider that is not there', async () => {
      const { service } = setup();

      expect((await refusal(service.needsCustomAccess('nope', {}))).name).toBe('NotFoundError');
    });
  });

  describe('a custom OIDC provider', () => {
    const body = {
      name: 'My IdP',
      discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
      clientId: 'oidc-id',
      clientSecret: SECRET,
    };

    it('is made with an id from its name, listed as oidc, and deleted', async () => {
      const { service, values } = setup();
      const created = await service.create(body);

      expect(created).toMatchObject({
        id: 'my-idp',
        kind: 'oidc',
        package: null,
        discoveryUrl: body.discoveryUrl,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: 'https://app.example.com/api/auth/callback/my-idp',
      });
      expect(everything(created)).not.toContain(SECRET);

      await service.delete('my-idp');

      expect((await service.list()).map((one) => one.id)).not.toContain('my-idp');
      expect(everything(values.get('providers') ?? {})).not.toContain('my-idp');
    });

    it('refuses an id that is taken, and a discovery URL that is not http(s)', async () => {
      const { service } = setup();

      expect((await refusal(service.create({ ...body, id: 'github' }))).message).toContain(
        'github'
      );
      expect(
        (await refusal(service.create({ ...body, discoveryUrl: 'ftp://idp.example.com' }))).message
      ).toContain('discoveryUrl');
    });

    it('makes the id from a name with long runs of dashes and symbols without slowing down', async () => {
      const { service } = setup();
      const started = Date.now();
      const created = await service.create({
        ...body,
        name: `${'-'.repeat(100_000)}My IdP${'-!'.repeat(50_000)}`,
      });

      expect(created.id).toBe('my-idp');
      expect(Date.now() - started).toBeLessThan(2000);

      const { service: other } = setup();

      expect(
        (await refusal(other.create({ ...body, name: '-'.repeat(100_000) }))).message
      ).toContain('id');
    });

    it('builds genericOAuth with pkce and the discovery URL', async () => {
      const { service } = setup();

      await service.create({ ...body, trustForLinking: true });

      expect(await service.options()).toEqual({
        socialProviders: {},
        genericOAuth: [
          {
            providerId: 'my-idp',
            pkce: true,
            overrideUserInfo: false,
            discoveryUrl: body.discoveryUrl,
            clientId: 'oidc-id',
            clientSecret: SECRET,
            scopes: ['openid', 'profile', 'email'],
          },
        ],
        trustedProviders: ['my-idp'],
        secrets: { fields: [], values: [SECRET] },
      });
    });
  });

  describe('options', () => {
    it('builds the social config of a built-in, and the generic config of a package', async () => {
      const { service } = setup();

      await service.update('github', { ...saveGithub, scopes: ['user:email'] });
      await service.update('acme', {
        clientId: 'acme-id',
        clientSecret: 'acme-secret',
        fields: { issuer: 'https://idp.example.com', signingKey: KEY_SECRET },
      });

      expect(await service.options()).toEqual({
        socialProviders: {
          github: {
            clientId: 'gh-id',
            clientSecret: SECRET,
            scope: ['user:email'],
            overrideUserInfoOnSignIn: false,
          },
        },
        genericOAuth: [
          {
            pkce: true,
            overrideUserInfo: false,
            providerId: 'acme',
            discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
            clientId: 'acme-id',
            clientSecret: 'acme-secret',
            scopes: ['openid'],
            signingKey: KEY_SECRET,
          },
        ],
        trustedProviders: [],
        secrets: {
          fields: ['signingKey'],
          values: [SECRET, KEY_SECRET, 'acme-secret'],
        },
      });
    });

    it('leaves out a disabled provider', async () => {
      const { service } = setup();

      await service.update('github', { ...saveGithub, enabled: false });

      expect((await service.options()).socialProviders).toEqual({});
    });

    it('is cached for the time of the settings, and read again at once after a save', async () => {
      vi.useFakeTimers();

      try {
        const { service, get, values } = setup();

        await service.options();
        await service.options();

        expect(get).toHaveBeenCalledTimes(1);

        // another server saved: seen only when the cache runs out
        values.set('providers', {
          github: {
            enabled: true,
            clientId: 'x',
            clientSecret: 'v1:00',
            scopes: [],
            trustForLinking: false,
            fields: {},
          },
        });
        expect(Object.keys((await service.options()).socialProviders)).toEqual([]);

        vi.advanceTimersByTime(PERMISSIONS_TTL_MS + 1);
        expect(Object.keys((await service.options()).socialProviders)).toEqual(['github']);

        await service.update('github', { clientId: 'again' });
        expect((await service.options()).socialProviders.github).toMatchObject({
          clientId: 'again',
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('secrets never leak', () => {
    it('is in no error message or log line, whatever fails', async () => {
      const { service, reload, log, encryption } = setup();
      const messages: string[] = [];
      const attempt = async (call: Promise<unknown>) => {
        try {
          await call;
        } catch (error) {
          messages.push((error as Error).message);
        }
      };

      await attempt(service.update('acme', { clientId: 'id', clientSecret: SECRET }));
      await attempt(service.update('github', { clientId: 5 as never, clientSecret: SECRET }));
      await attempt(service.update('github', { ...saveGithub, enabled: 'yes' as never }));

      reload.mockRejectedValueOnce(new Error(`failed with ${SECRET}`));
      await attempt(service.update('github', saveGithub));

      encryption.encrypt.mockReturnValueOnce(null);
      await attempt(service.update('github', saveGithub));

      expect(messages.length).toBe(5);
      expect(everything(messages)).not.toContain(SECRET);
      expect(everything([log.warn.mock.calls, log.error.mock.calls])).not.toContain(SECRET);
    });
  });

  describe('secrets follow their endpoint', () => {
    const acmeSave = {
      clientId: 'acme-id',
      clientSecret: 'acme-secret',
      fields: { issuer: 'https://idp.example.com', signingKey: KEY_SECRET },
    };

    it('refuses a changed url field unless the client secret is sent again', async () => {
      const { service, values } = setup();

      await service.update('acme', acmeSave);

      const before = structuredClone(values.get('providers'));
      const error = await refusal(
        service.update('acme', { fields: { issuer: 'https://evil.example.com' } })
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toMatch(/client secret has to be entered again/);
      expect(values.get('providers')).toEqual(before);
    });

    it('clears a secret field that is not sent again with the new address', async () => {
      const { service, values } = setup();

      await service.update('acme', acmeSave);
      await service.update('acme', {
        clientSecret: 'new-secret',
        fields: { issuer: 'https://other.example.com' },
      });

      const stored = (values.get('providers') as Record<string, any>).acme;

      expect(stored.fields.signingKey).toBeUndefined();
      expect(stored.fields.issuer).toBe('https://other.example.com');
      expect((await service.options()).genericOAuth[0]).toMatchObject({
        clientSecret: 'new-secret',
        signingKey: undefined,
      });
    });

    it('keeps the secrets when the address is sent again unchanged', async () => {
      const { service } = setup();

      await service.update('acme', acmeSave);
      await service.update('acme', { fields: { issuer: 'https://idp.example.com' } });

      expect((await service.options()).genericOAuth[0]).toMatchObject({
        clientSecret: 'acme-secret',
        signingKey: KEY_SECRET,
      });
    });

    it('treats a changed discovery URL of a custom provider the same way', async () => {
      const { service } = setup();
      const custom = {
        name: 'My IdP',
        discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
        clientId: 'oidc-id',
        clientSecret: SECRET,
      };

      await service.create(custom);

      const moved = { discoveryUrl: 'https://evil.example.com/.well-known/openid-configuration' };

      await expect(service.update('my-idp', moved)).rejects.toThrow(/entered again/);

      await service.update('my-idp', { ...moved, clientSecret: 'fresh-secret' });

      expect((await service.options()).genericOAuth[0]).toMatchObject({
        discoveryUrl: moved.discoveryUrl,
        clientSecret: 'fresh-secret',
      });
    });
  });

  describe('secrets follow every field that shapes where the provider talks', () => {
    const builtIn = (id: string) =>
      BUILT_IN_PROVIDERS.find((definition) => definition.id === id) as ProviderDefinition;

    /** A package whose host comes out of a plain string field, as a typical provider package does. */
    const tenanted = createDefinition('oauth', {
      id: 'tenanted',
      name: 'Tenanted',
      fields: {
        tenant: { type: 'string', label: 'Tenant', required: true },
        region: { type: 'select', label: 'Region', options: ['eu', 'us'], default: 'eu' },
        verbose: { type: 'boolean', label: 'Verbose' },
        apiKey: { type: 'secret', label: 'API key' },
      },
      init: ({ clientId, clientSecret, scopes, tenant }) => ({
        discoveryUrl: `https://${String(tenant)}.example.com/.well-known/openid-configuration`,
        clientId,
        clientSecret,
        scopes,
      }),
    });

    const cases: Array<{
      title: string;
      definition: () => ProviderDefinition;
      first: Record<string, string>;
      changed: Record<string, string>;
    }> = [
      {
        title: 'the Auth0 domain',
        definition: () => builtIn('auth0'),
        first: { domain: 'dev-one.eu.auth0.com' },
        changed: { domain: 'attacker.example' },
      },
      {
        title: 'the Cognito domain',
        definition: () => builtIn('cognito'),
        first: {
          domain: 'one.auth.us-east-1.amazoncognito.com',
          region: 'us-east-1',
          userPoolId: 'p',
        },
        changed: { domain: 'attacker.example' },
      },
      {
        title: 'the Cognito region',
        definition: () => builtIn('cognito'),
        first: {
          domain: 'one.auth.us-east-1.amazoncognito.com',
          region: 'us-east-1',
          userPoolId: 'p',
        },
        changed: { region: 'attacker.example/x' },
      },
      {
        title: 'a string field of a package',
        definition: () => tenanted,
        first: { tenant: 'one' },
        changed: { tenant: 'evil.example.com/x' },
      },
      {
        title: 'a select field of a package',
        definition: () => tenanted,
        first: { tenant: 'one' },
        changed: { region: 'us' },
      },
    ];

    it.each(cases)(
      'refuses a changed $title unless the client secret is sent again',
      async ({ definition, first, changed }) => {
        registryState.extra = [definition()];

        const id = definition().id;
        const { service, values } = setup();

        await service.update(id, { clientId: 'id', clientSecret: SECRET, fields: first });

        const before = structuredClone(values.get('providers'));
        const error = await refusal(service.update(id, { fields: changed }));

        expect(error.name).toBe('ValidationError');
        expect(error.message).toMatch(/client secret has to be entered again/);
        expect(values.get('providers')).toEqual(before);
      }
    );

    it('clears a secret field that is not sent again, once the client secret is', async () => {
      registryState.extra = [tenanted];

      const { service, values } = setup();

      await service.update('tenanted', {
        clientId: 'id',
        clientSecret: SECRET,
        fields: { tenant: 'one', apiKey: KEY_SECRET },
      });
      await service.update('tenanted', {
        clientSecret: 'fresh-secret',
        fields: { tenant: 'two' },
      });

      const stored = (values.get('providers') as Record<string, any>).tenanted;

      expect(stored.fields.apiKey).toBeUndefined();
      expect(stored.fields.tenant).toBe('two');
    });

    it('keeps the secrets when a field is sent again unchanged, or only a boolean changes', async () => {
      registryState.extra = [tenanted];

      const { service } = setup();

      await service.update('tenanted', {
        clientId: 'id',
        clientSecret: SECRET,
        fields: { tenant: 'one', apiKey: KEY_SECRET },
      });
      await service.update('tenanted', { fields: { tenant: 'one', region: 'eu', verbose: true } });

      expect((await service.options()).genericOAuth[0]).toMatchObject({ clientSecret: SECRET });
    });

    it('does not count a field that was never set and is still empty as a change', async () => {
      registryState.extra = [builtIn('apple')];

      const { service } = setup();

      await service.update('apple', { clientId: 'id', clientSecret: SECRET });
      await service.update('apple', { fields: { appBundleIdentifier: '' } });

      expect((await service.options()).socialProviders.apple).toMatchObject({
        clientSecret: SECRET,
      });
    });
  });

  describe('a discovery document is checked on save', () => {
    let server: Server;
    let origin = '';
    let hits: string[] = [];

    const documents: Record<string, { status: number; body: string; delay?: number }> = {
      '/ok/.well-known/openid-configuration': {
        status: 200,
        body: JSON.stringify({
          issuer: 'http://x',
          authorization_endpoint: 'http://x/authorize',
          token_endpoint: 'http://x/token',
        }),
      },
      '/missing/.well-known/openid-configuration': {
        status: 404,
        body: '<html>secret fetched page body</html>',
      },
      '/html/.well-known/openid-configuration': {
        status: 200,
        body: '<html>secret fetched page body</html>',
      },
      '/no-token/.well-known/openid-configuration': {
        status: 200,
        body: JSON.stringify({ issuer: 'http://x', authorization_endpoint: 'http://x/authorize' }),
      },
      '/no-authorization/.well-known/openid-configuration': {
        status: 200,
        body: JSON.stringify({ issuer: 'http://x', token_endpoint: 'http://x/token' }),
      },
      '/array/.well-known/openid-configuration': { status: 200, body: '[]' },
    };

    beforeAll(async () => {
      server = createServer((request, response) => {
        const found = documents[request.url ?? ''];

        hits.push(request.url ?? '');

        if (!found) {
          response.writeHead(404).end();

          return;
        }

        response.writeHead(found.status, { 'content-type': 'application/json' });
        response.end(found.body);
      });

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
      });

      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    });

    beforeEach(() => {
      hits = [];
    });

    const custom = (path: string) => ({
      name: 'My IdP',
      discoveryUrl: `${origin}${path}/.well-known/openid-configuration`,
      clientId: 'oidc-id',
      clientSecret: SECRET,
    });

    it('saves a provider whose discovery document is a good one, without a mocked reload', async () => {
      const { service, reload } = setup();

      const created = await service.create(custom('/ok'));

      expect(created.status).toBe('ready');
      expect(hits).toEqual(['/ok/.well-known/openid-configuration']);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['answers 404', '/missing', 'could not be reached'],
      ['answers something that is not JSON', '/html', 'is not an OpenID discovery document'],
      ['answers JSON that is not an object', '/array', 'is not an OpenID discovery document'],
      ['names no token endpoint', '/no-token', 'names no token endpoint'],
      ['names no authorization endpoint', '/no-authorization', 'names no authorization endpoint'],
    ])('refuses with a 400 when the document %s, storing nothing', async (_, path, message) => {
      const { service, values, reload, set } = setup();
      const error = await refusal(service.create(custom(path)));

      expect(error.name).toBe('ValidationError');
      expect(error.message).toContain(message);
      expect(everything(error)).not.toContain('fetched page body');
      expect(everything(error)).not.toContain(SECRET);
      expect(values.has('providers')).toBe(false);
      expect(set).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
    });

    it('refuses an address nothing listens on', async () => {
      const { service, values } = setup();
      const error = await refusal(
        service.create({ ...custom('/ok'), discoveryUrl: 'http://127.0.0.1:1/.well-known/x' })
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toContain('could not be reached');
      expect(values.has('providers')).toBe(false);
    });

    it('gives up after the time budget, and refuses', async () => {
      vi.useFakeTimers();

      try {
        vi.stubGlobal(
          'fetch',
          vi.fn(
            (_input: unknown, init?: RequestInit) =>
              new Promise((_, reject) => {
                init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
              })
          )
        );

        const { service } = setup();
        const saving = refusal(service.create(custom('/ok')));

        await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS + 1);

        expect((await saving).message).toContain('could not be reached');
      } finally {
        vi.useRealTimers();
      }
    });

    it('checks the document when an existing custom provider is moved, and keeps the old one', async () => {
      const { service, values } = setup();

      await service.create(custom('/ok'));

      const before = structuredClone(values.get('providers'));
      const error = await refusal(
        service.update('my-idp', {
          discoveryUrl: custom('/missing').discoveryUrl,
          clientSecret: 'fresh-secret',
        })
      );

      expect(error.message).toContain('could not be reached');
      expect(values.get('providers')).toEqual(before);
    });

    it('checks the discovery URL a package builds from its fields', async () => {
      registryState.extra = [
        createDefinition('oauth', {
          id: 'hosted',
          name: 'Hosted',
          fields: { base: { type: 'url', label: 'Base', required: true } },
          init: ({ clientId, clientSecret, scopes, base }) => ({
            discoveryUrl: `${String(base)}/.well-known/openid-configuration`,
            clientId,
            clientSecret,
            scopes,
          }),
        }),
      ];

      const { service, values } = setup();
      const error = await refusal(
        service.update('hosted', {
          clientId: 'id',
          clientSecret: SECRET,
          fields: { base: `${origin}/missing` },
        })
      );

      expect(error.message).toContain('could not be reached');
      expect(values.has('providers')).toBe(false);

      await service.update('hosted', {
        clientId: 'id',
        clientSecret: SECRET,
        fields: { base: `${origin}/ok` },
      });
    });

    it('does not fetch for a provider that is saved disabled, or one with no discovery URL', async () => {
      const { service } = setup();

      await service.create({ ...custom('/missing'), enabled: false });
      await service.update('github', saveGithub);

      expect(hits).toEqual([]);
    });

    it('refuses a provider whose init throws, with a fixed message that leaves the text out', async () => {
      registryState.extra = [
        createDefinition('oauth', {
          id: 'broken',
          name: 'Broken',
          init({ clientSecret }) {
            throw new Error(`cannot use ${String(clientSecret)} here`);
          },
        }),
      ];

      const { service, values, reload } = setup();
      const error = await refusal(
        service.update('broken', { clientId: 'id', clientSecret: SECRET })
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe(
        'The provider "broken" was not saved: its definition cannot be built from these settings.'
      );
      expect(everything(error)).not.toContain(SECRET);
      expect(values.has('providers')).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    });
  });

  describe('a stale cache', () => {
    it('does not decide what a save keeps (it uses the store as it is)', async () => {
      const { service, values } = setup();

      await service.update('acme', acmeStored());
      await service.get('acme'); // fills the cache

      // another server saved a different signing key, which the cache does not know yet
      const stored = structuredClone(values.get('providers')) as Record<string, any>;

      stored.acme.fields.signingKey = `v1:${Buffer.from('FRESH-KEY').toString('hex')}`;
      values.set('providers', stored);

      await service.update('acme', { clientId: 'renamed' });

      expect((await service.options()).genericOAuth[0]).toMatchObject({
        clientId: 'renamed',
        signingKey: 'FRESH-KEY',
      });
    });
  });

  describe('reserved ids', () => {
    it('refuses a custom provider named credential', async () => {
      const { service } = setup();

      const error = await refusal(
        service.create({
          name: 'Credential',
          id: 'credential',
          discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
          clientId: 'x',
          clientSecret: SECRET,
        })
      );

      expect(error.name).toBe('ValidationError');
      expect(error.message).toMatch(/reserved/);
    });
  });

  describe('configured', () => {
    it('is true for a stored entry, enabled or not, a config entry and a custom provider', async () => {
      registryState.configured = [
        {
          definition: acme,
          options: { clientId: 'c', clientSecret: 's', issuer: 'https://i.example.com' },
          enabled: true,
        },
      ];

      const { service } = setup();

      expect(
        Object.fromEntries((await service.list()).map((one) => [one.id, one.configured]))
      ).toEqual({
        github: false,
        acme: true,
      });

      await service.update('github', { ...saveGithub, enabled: false });
      await service.create({
        name: 'My IdP',
        discoveryUrl: 'https://idp.example.com/.well-known/openid-configuration',
        clientId: 'x',
        clientSecret: SECRET,
      });

      expect(
        Object.fromEntries((await service.list()).map((one) => [one.id, one.configured]))
      ).toEqual({
        github: true,
        acme: true,
        'my-idp': true,
      });
    });
  });
});

const acmeStored = () => ({
  clientId: 'acme-id',
  clientSecret: 'acme-secret',
  fields: { issuer: 'https://idp.example.com', signingKey: KEY_SECRET },
});
