import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { socialProviderList } from '@better-auth/core/social-providers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { BUILT_IN_PROVIDERS } from '../built-in';
import {
  defineProvider,
  isProviderDefinition,
  readClaim,
  readPath,
  resolveOptions,
} from '../define-provider';
import { registry } from '../registry';
import { validateConfig } from '../../config/validate-config';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'end-users-providers-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * Writes a provider package into the project's node_modules. It brands its export the way
 * `defineProvider` does (a `Symbol.for` key), as a package built against its own copy of the plugin does.
 */
const installPackage = (
  name: string,
  { id, definition = {} }: { id: string; definition?: Record<string, unknown> }
) => {
  const dir = join(root, 'node_modules', ...name.split('/'));

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, main: 'index.js' }));
  writeFileSync(
    join(dir, 'index.js'),
    `const definition = Object.assign({
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(`Package ${id}`)},
  init: (options) => ({ from: ${JSON.stringify(name)}, discoveryUrl: options.clientId }),
}, ${JSON.stringify(definition)});
Object.defineProperty(definition, Symbol.for('strapi.end-users.provider'), { value: true });
module.exports = { __esModule: true, default: Object.assign(definition, { kind: 'oauth' }) };
`
  );
};

const strapiWith = (providers?: unknown[], log = { warn: vi.fn() }) =>
  ({
    log,
    config: {
      get: (key: string, fallback: unknown) =>
        key === 'plugin::end-users.providers' ? (providers ?? fallback) : fallback,
    },
    dirs: { app: { root } },
  }) as unknown as Core.Strapi;

const credentials = { clientId: 'id', clientSecret: 'secret' };

describe('built-in providers', () => {
  it('offers every Better Auth built-in with nothing installed', () => {
    const available = registry(strapiWith()).available();

    expect(available).toHaveLength(46);
    expect(available.filter((p) => p.kind === 'social')).toHaveLength(36);
    expect(available.filter((p) => p.kind === 'oauth').map((p) => p.id)).toEqual([
      'auth0',
      'gumroad',
      'hubspot',
      'keycloak',
      'line-oidc',
      'microsoft-entra-id',
      'okta',
      'patreon',
      'slack-oidc',
      'yandex',
    ]);
    expect(new Set(available.map((p) => p.id)).size).toBe(46);
    expect(available.every(isProviderDefinition)).toBe(true);
  });

  it("matches Better Auth's own socialProviders list", () => {
    const ours = BUILT_IN_PROVIDERS.filter((p) => p.kind === 'social').map((p) => p.id);

    expect([...ours].sort()).toEqual([...socialProviderList].sort());
  });

  it("matches Better Auth's own generic OAuth presets", () => {
    // eslint-disable-next-line node/no-missing-require
    const entry = require.resolve('better-auth/plugins/generic-oauth');
    const shipped = readdirSync(join(dirname(entry), 'providers'))
      .filter((file) => file.endsWith('.mjs') && file !== 'index.mjs')
      .map((file) => file.replace(/\.mjs$/, ''));

    const ours = BUILT_IN_PROVIDERS.filter((p) => p.kind === 'oauth').map((p) =>
      p.id.replace(/-oidc$/, '')
    );

    expect([...ours].sort()).toEqual([...shipped].sort());
  });

  it('declares as required fields the options Better Auth requires', () => {
    const required = (id: string) =>
      Object.entries(registry(strapiWith()).get(id)?.fields ?? {})
        .filter(([, field]) => field.required)
        .map(([key]) => key);

    expect(required('cognito')).toEqual(['domain', 'region', 'userPoolId']);
    expect(required('okta')).toEqual(['issuer']);
    expect(required('auth0')).toEqual(['domain']);
    expect(required('keycloak')).toEqual(['issuer']);
    expect(required('microsoft-entra-id')).toEqual(['tenantId']);
    expect(registry(strapiWith()).get('apple')?.fields).toHaveProperty('appBundleIdentifier');
  });

  it('builds a social provider config from the options', () => {
    const github = registry(strapiWith()).get('github')!;

    expect(github.init({ ...credentials, scopes: [] })).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
    });
    expect(github.init({ ...credentials, scopes: ['read:org'] })).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
      scope: ['read:org'],
    });
    expect(
      registry(strapiWith())
        .get('cognito')!
        .init({ ...credentials, scopes: [], domain: 'd', region: 'r', userPoolId: 'p' })
    ).toMatchObject({ domain: 'd', region: 'r', userPoolId: 'p' });
  });

  it("gives TikTok's client id as its client key", () => {
    expect(
      registry(strapiWith())
        .get('tiktok')!
        .init({ ...credentials, scopes: [] })
    ).toEqual({
      clientKey: 'id',
      clientSecret: 'secret',
    });
  });

  it('names the Better Auth preset and its options, with no Better Auth import', () => {
    const okta = registry(strapiWith()).get('okta')!;

    expect(okta.init({ ...credentials, scopes: [], issuer: 'https://dev-1.okta.com/x/' })).toEqual({
      strapiPreset: {
        name: 'okta',
        options: { ...credentials, issuer: 'https://dev-1.okta.com/x/' },
      },
    });
    expect(
      okta.init({ ...credentials, scopes: ['groups'], issuer: 'https://x.okta.com' })
    ).toMatchObject({ strapiPreset: { options: { scopes: ['groups'] } } });
    expect(
      registry(strapiWith())
        .get('slack-oidc')!
        .init({ ...credentials, scopes: [] })
    ).toEqual({
      strapiPreset: { name: 'slack', options: credentials },
    });
  });
});

describe('validating field values against the definition', () => {
  const definition = defineProvider({
    id: 'sample',
    name: 'Sample',
    fields: {
      tenant: { type: 'string', label: 'Tenant', required: true },
      site: { type: 'url', label: 'Site' },
      mode: { type: 'select', label: 'Mode', options: ['a', 'b'], default: 'a' },
      strict: { type: 'boolean', label: 'Strict' },
      key: { type: 'secret', label: 'Key', multiline: true },
    },
    defaultScopes: ['openid'],
    init: (options) => options,
  });

  const resolve = (options: Record<string, unknown>) => resolveOptions(definition, options, 'x');

  it('fills defaults and the default scopes in, and leaves out what is not declared', () => {
    expect(resolve({ ...credentials, tenant: 't', other: 1 })).toEqual({
      ...credentials,
      tenant: 't',
      mode: 'a',
      scopes: ['openid'],
    });
  });

  it('refuses a missing required field, client id or secret', () => {
    expect(() => resolve({ clientSecret: 's', tenant: 't' })).toThrow(/`clientId` is missing/);
    expect(() => resolve({ clientId: 'i', tenant: 't' })).toThrow(/`clientSecret` is missing/);
    expect(() => resolve({ ...credentials, tenant: '' })).toThrow(
      /`tenant` \(Tenant\) is required/
    );
  });

  it('refuses a value of the wrong type', () => {
    expect(() => resolve({ ...credentials, tenant: 3 })).toThrow(/`tenant`.*must be a string/);
    expect(() => resolve({ ...credentials, tenant: 't', strict: 'yes' })).toThrow(
      /`strict`.*true or false/
    );
    expect(() => resolve({ ...credentials, tenant: 't', site: 'nope' })).toThrow(/`site`.*a URL/);
    expect(() => resolve({ ...credentials, tenant: 't', site: 'ftp://x.test' })).toThrow(
      /http\(s\)/
    );
    expect(() => resolve({ ...credentials, tenant: 't', scopes: 'openid' })).toThrow(/`scopes`/);
    expect(() => resolve({ ...credentials, clientId: 4, tenant: 't' })).toThrow(/`clientId`/);
  });

  it('refuses a select value that is not one of its options', () => {
    expect(() => resolve({ ...credentials, tenant: 't', mode: 'c' })).toThrow(
      /`mode`.*one of "a", "b"/
    );
  });

  it('takes valid values', () => {
    expect(
      resolve({
        ...credentials,
        tenant: 't',
        site: 'https://x.test',
        mode: 'b',
        strict: false,
        key: 'k',
      })
    ).toMatchObject({ site: 'https://x.test', mode: 'b', strict: false, key: 'k' });
  });
});

describe('defineProvider', () => {
  it('makes a definition of kind oauth that isProviderDefinition recognizes', () => {
    const definition = defineProvider({ id: 'my-idp', name: 'My IdP', init: () => ({}) });

    expect(definition.kind).toBe('oauth');
    expect(isProviderDefinition(definition)).toBe(true);
    expect(isProviderDefinition({ id: 'my-idp', name: 'My IdP', init: () => ({}) })).toBe(false);
    expect(isProviderDefinition(null)).toBe(false);
  });

  it('refuses a definition that cannot work', () => {
    const init = () => ({});

    expect(() => defineProvider({ id: 'My IdP', name: 'x', init })).toThrow(/`id`/);
    expect(() => defineProvider({ id: 'a', name: '', init })).toThrow(/`name`/);
    expect(() => defineProvider({ id: 'a', name: 'a' } as never)).toThrow(/`init`/);
    expect(() =>
      defineProvider({
        id: 'a',
        name: 'a',
        init,
        fields: { clientId: { type: 'string', label: 'x' } },
      })
    ).toThrow(/clientId/);
    expect(() => defineProvider({ id: 'credential', name: 'x', init })).toThrow(/reserved/);
    expect(() =>
      defineProvider({ id: 'a', name: 'a', init, fields: { m: { type: 'select', label: 'x' } } })
    ).toThrow(/options/);
  });
});

describe('claims', () => {
  const definition = defineProvider({
    id: 'claims',
    name: 'Claims',
    init: () => ({}),
    claims: {
      department: { type: 'string', label: 'Department' },
      city: { type: 'string', label: 'City', path: 'address.city' },
    },
  });
  const profile = { department: 'R&D', address: { city: 'Lyon' } };

  it('reads a claim from the provider profile by its path', () => {
    expect(readClaim(definition, 'city', profile)).toBe('Lyon');
  });

  it('reads at the key when there is no path', () => {
    expect(readClaim(definition, 'department', profile)).toBe('R&D');
  });

  it('gives nothing for a missing step or a claim the definition does not list', () => {
    expect(readClaim(definition, 'city', { address: null })).toBeUndefined();
    expect(readClaim(definition, 'city', {})).toBeUndefined();
    expect(readClaim(definition, 'other', profile)).toBeUndefined();
  });

  it('reads own properties only along a path', () => {
    const other = defineProvider({
      id: 'proto',
      name: 'Proto',
      init: () => ({}),
      claims: { c: { type: 'string', label: 'C', path: 'constructor.name' } },
    });

    expect(readClaim(other, 'c', {})).toBeUndefined();
    expect(readPath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(readPath({}, '__proto__.polluted')).toBeUndefined();
    expect(readPath({ list: ['x'] }, 'list.0')).toBe('x');
  });

  it('lists suggestions for the built-ins that have them', () => {
    const github = registry(strapiWith()).get('github')!;

    expect(readClaim(github, 'company', { company: 'Strapi' })).toBe('Strapi');
  });
});

describe('provider packages', () => {
  it('resolves @strapi/provider-end-users-<name> before the name as given', () => {
    installPackage('@strapi/provider-end-users-acme', { id: 'acme-scoped' });
    installPackage('acme', { id: 'acme-bare' });

    const providers = registry(strapiWith(['acme']));

    expect(providers.get('acme-scoped')).toBeDefined();
    expect(providers.get('acme-bare')).toBeUndefined();
  });

  it('falls back to the name as given', () => {
    installPackage('my-company-idp', { id: 'company' });

    expect(registry(strapiWith(['my-company-idp'])).get('company')?.name).toBe('Package company');
  });

  it('a string entry adds a package to the available providers, unconfigured', () => {
    installPackage('@strapi/provider-end-users-acme', { id: 'acme' });

    const providers = registry(strapiWith(['acme']));

    expect(providers.available().map((p) => p.id)).toContain('acme');
    expect(providers.available()).toHaveLength(47);
    expect(providers.fromConfig()).toEqual([]);
  });

  it('an object entry configures a built-in, locked', () => {
    const providers = registry(
      strapiWith([
        { provider: 'github', options: credentials },
        { provider: 'google', options: credentials, enabled: false },
      ])
    );

    expect(providers.fromConfig()).toEqual([
      { definition: providers.get('github'), options: credentials, enabled: true },
      { definition: providers.get('google'), options: credentials, enabled: false },
    ]);
    expect(providers.available()).toHaveLength(46);
  });

  it('an object entry configures a package, locked, and makes it available', () => {
    installPackage('@strapi/provider-end-users-acme', { id: 'acme' });

    const providers = registry(strapiWith([{ provider: 'acme', options: credentials }]));

    expect(providers.get('acme')).toBeDefined();
    expect(providers.fromConfig()).toHaveLength(1);
    expect(providers.fromConfig()[0].definition.id).toBe('acme');
  });

  it('takes one package named by a string and by an object', () => {
    installPackage('@strapi/provider-end-users-acme', { id: 'acme' });

    expect(() =>
      registry(strapiWith(['acme', { provider: 'acme', options: credentials }]))
    ).not.toThrow();
  });

  describe('refuses to start', () => {
    const refusal = (providers: unknown[]) => () => registry(strapiWith(providers));

    it('for a package that cannot be resolved, naming config/plugins.ts and the entry', () => {
      expect(refusal(['nothing-here'])).toThrow(
        /config\/plugins\.ts.*providers\[0\] \("nothing-here"\).*could not be resolved/s
      );
      expect(refusal([{ provider: 'nothing-here', options: credentials }])).toThrow(
        /providers\[0\] \("nothing-here"\)/
      );
    });

    it('for a default export that is not a defineProvider() result', () => {
      const dir = join(root, 'node_modules', 'plain-idp');

      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'index.js'),
        "module.exports = { id: 'plain', name: 'Plain', init() {} };"
      );

      expect(refusal(['plain-idp'])).toThrow(
        /config\/plugins\.ts.*providers\[0\] \("plain-idp"\).*defineProvider\(\)/s
      );
    });

    it('for an id that clashes with a built-in', () => {
      installPackage('clash-idp', { id: 'github' });

      expect(refusal(['clash-idp'])).toThrow(
        /config\/plugins\.ts.*providers\[0\] \("clash-idp"\).*"github".*built-in/s
      );
    });

    it('for an id that clashes with another package', () => {
      installPackage('one-idp', { id: 'same' });
      installPackage('two-idp', { id: 'same' });

      expect(refusal(['one-idp', 'two-idp'])).toThrow(
        /providers\[1\] \("two-idp"\).*"same".*package "one-idp"/s
      );
    });

    it('for an object entry without a client id or a secret', () => {
      expect(refusal([{ provider: 'github', options: { clientSecret: 's' } }])).toThrow(
        /config\/plugins\.ts.*providers\[0\] \("github"\).*`clientId` is missing/s
      );
      expect(refusal([{ provider: 'github', options: { clientId: 'i' } }])).toThrow(
        /`clientSecret` is missing/
      );
    });

    it('for an object entry without a required field', () => {
      expect(refusal([{ provider: 'okta', options: credentials }])).toThrow(
        /providers\[0\] \("okta"\).*`issuer` \(Issuer URL\) is required/s
      );
    });

    it('for a field value of the wrong type', () => {
      expect(
        refusal([{ provider: 'okta', options: { ...credentials, issuer: 'not a url' } }])
      ).toThrow(/providers\[0\] \("okta"\).*`issuer`.*a URL/s);
      expect(
        refusal([{ provider: 'paypal', options: { ...credentials, environment: 'beta' } }])
      ).toThrow(/`environment`.*one of "live", "sandbox"/);
    });

    it('for a provider configured twice', () => {
      expect(
        refusal([
          { provider: 'github', options: credentials },
          { provider: 'github', options: credentials },
        ])
      ).toThrow(/providers\[1\] \("github"\).*configured twice/s);
    });
  });
});

describe('the providers key', () => {
  const validate = (providers: unknown) => () => validateConfig({ providers }, {});

  it('takes package names and { provider, options, enabled? } entries', () => {
    expect(
      validate(['acme', { provider: 'github', options: credentials, enabled: false }])
    ).not.toThrow();
    expect(validate(undefined)).not.toThrow();
    expect(validate([])).not.toThrow();
  });

  it('refuses a shape it cannot read', () => {
    expect(validate('github')).toThrow(/`providers`/);
    expect(validate([3])).toThrow(/`providers\[0\]`/);
    expect(validate([''])).toThrow(/`providers\[0\]`/);
    expect(validate([{ options: credentials }])).toThrow(/`providers\[0\]\.provider`/);
    expect(validate([{ provider: 'github' }])).toThrow(/`providers\[0\]\.options`/);
    expect(validate([{ provider: 'github', options: credentials, enabled: 'no' }])).toThrow(
      /`providers\[0\]\.enabled`/
    );
  });
});

describe('unknown option keys', () => {
  it('warns once, naming the file, the entry and the keys, and still configures it', () => {
    const log = { warn: vi.fn() };
    const configured = registry(
      strapiWith(
        [{ provider: 'github', options: { ...credentials, clientSecrett: 'x', foo: 1 } }],
        log
      )
    ).fromConfig();

    expect(configured).toHaveLength(1);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toMatch(
      /providers\[0\].*config\/plugins\.ts.*`clientSecrett`, `foo`/
    );
  });

  it('does not warn for the common keys or a field the definition declares', () => {
    installPackage('provider-with-field', {
      id: 'with-field',
      definition: { fields: { tenant: { label: 'Tenant', type: 'string' } } },
    });
    const log = { warn: vi.fn() };

    registry(
      strapiWith(
        [
          { provider: 'github', options: { ...credentials, scopes: ['a'], enabled: true } },
          { provider: 'provider-with-field', options: { ...credentials, tenant: 't' } },
        ],
        log
      )
    );

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('refuses a package whose provider id is reserved by the sign-in engine', () => {
    installPackage('provider-credential', { id: 'credential' });

    expect(() => registry(strapiWith(['provider-credential']))).toThrow(
      /provider-credential.*"credential" is reserved/s
    );
  });
});
