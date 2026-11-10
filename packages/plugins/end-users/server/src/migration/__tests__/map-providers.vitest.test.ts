import { describe, expect, it } from 'vitest';

import { endUsersProviderOf, mapUpGrant } from '../map-providers';
import type { UpGrant } from '../map-providers';

// Built at runtime: no key-shaped literal in the source
const key = ['client', 'id', Date.now()].join('-');
const secret = ['client', 'secret', Date.now()].join('-');

const none = () => null;

describe('mapUpGrant', () => {
  it('maps github with its key, secret, scopes and enabled flag, preferring callback over callbackUrl', () => {
    const grant: UpGrant = {
      github: {
        enabled: true,
        key,
        secret,
        scope: 'user, user:email',
        callback: 'https://app.test/a',
        callbackUrl: 'https://app.test/b',
      },
    };

    expect(mapUpGrant(grant, none)).toEqual([
      {
        kind: 'mapped',
        upId: 'github',
        callback: 'https://app.test/a',
        body: {
          clientId: key,
          clientSecret: secret,
          enabled: true,
          scopes: ['user', 'user:email'],
        },
      },
    ]);
  });

  it('accepts scopes as an array and falls back to callbackUrl', () => {
    const [mapping] = mapUpGrant(
      {
        google: { enabled: true, key, secret, scope: ['email'], callbackUrl: 'https://app.test/c' },
      },
      none
    );

    expect(mapping).toMatchObject({
      kind: 'mapped',
      callback: 'https://app.test/c',
      body: { scopes: ['email'] },
    });
  });

  it('builds the Auth0 domain and the Keycloak issuer', () => {
    const required = (id: string) => (id === 'auth0' ? ['domain'] : ['issuer']);
    const [auth0, keycloak] = mapUpGrant(
      {
        auth0: { enabled: true, key, secret, subdomain: 'tenant' },
        keycloak: { enabled: true, key, secret, subdomain: 'sso.example.test/realms/app' },
      },
      required
    );

    expect(auth0).toMatchObject({
      kind: 'mapped',
      body: { fields: { domain: 'tenant.auth0.com' } },
    });
    expect(keycloak).toMatchObject({
      kind: 'mapped',
      body: { fields: { issuer: 'https://sso.example.test/realms/app' } },
    });
  });

  it('reads the Cognito region and pool id from jwksurl, and asks for them without it', () => {
    const required = () => ['domain', 'region', 'userPoolId'];
    const base = { enabled: true, key, secret, subdomain: 'login.example.test' };
    const [full] = mapUpGrant(
      {
        cognito: {
          ...base,
          jwksurl:
            'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Abc123/.well-known/jwks.json',
        },
      },
      required
    );

    expect(full).toMatchObject({
      kind: 'mapped',
      body: {
        fields: {
          domain: 'login.example.test',
          region: 'eu-west-1',
          userPoolId: 'eu-west-1_Abc123',
        },
      },
    });

    const [without] = mapUpGrant({ cognito: base }, required);

    expect(without).toMatchObject({
      kind: 'needs-input',
      missing: ['region', 'userPoolId'],
      body: { enabled: false },
    });
  });

  it('stores twitter disabled as needing input, and lists instagram, cas and an unknown id', () => {
    const entry = { enabled: true, key, secret };
    const result = mapUpGrant({ twitter: entry, instagram: entry, cas: entry, myidp: entry }, none);

    expect(result).toEqual([
      {
        kind: 'needs-input',
        upId: 'twitter',
        callback: null,
        missing: ['clientId', 'clientSecret'],
        body: { enabled: false },
      },
      { kind: 'not-supported', upId: 'instagram', reason: 'no-equivalent' },
      { kind: 'not-supported', upId: 'cas', reason: 'no-equivalent' },
      { kind: 'not-supported', upId: 'myidp', reason: 'custom' },
    ]);
  });

  it('asks for a field the definition requires that the grant never had', () => {
    const [mapping] = mapUpGrant({ discord: { enabled: true, key, secret } }, () => ['guildId']);

    expect(mapping).toMatchObject({
      kind: 'needs-input',
      missing: ['guildId'],
      body: { enabled: false, clientId: key },
    });
  });

  it('asks for the client secret an enabled provider is missing', () => {
    const [mapping] = mapUpGrant({ facebook: { enabled: true, key } }, none);

    expect(mapping).toMatchObject({ kind: 'needs-input', missing: ['clientSecret'] });
  });

  it('leaves out a provider nobody configured', () => {
    expect(
      mapUpGrant({ github: { enabled: false, key: '', secret: '' }, twitter: {} }, none)
    ).toEqual([]);
  });

  it('does not throw on an empty grant entry', () => {
    expect(mapUpGrant({ github: null } as unknown as UpGrant, none)).toEqual([]);
  });

  it('turns the email entry into the email and password method', () => {
    expect(mapUpGrant({ email: { enabled: true } }, none)).toEqual([
      { kind: 'email', enabled: true },
    ]);
    expect(mapUpGrant({ email: { enabled: false } }, none)).toEqual([
      { kind: 'email', enabled: false },
    ]);
  });
});

describe('endUsersProviderOf', () => {
  it('keeps the id of every provider a user signed up with, carried or not', () => {
    for (const id of ['github', 'keycloak', 'twitter', 'instagram', 'my-custom']) {
      expect(endUsersProviderOf(id)).toBe(id);
    }

    expect(endUsersProviderOf(' github ')).toBe('github');
  });

  it('answers null for a password user and a provider that is not named', () => {
    for (const value of ['local', '', '  ', null, undefined, 42]) {
      expect(endUsersProviderOf(value), String(value)).toBeNull();
    }
  });
});
