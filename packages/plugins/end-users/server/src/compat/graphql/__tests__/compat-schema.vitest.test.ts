import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID } from '../../../constants';
import {
  compatResolversConfig,
  profileScalarFields,
  registerCompatGraphql,
} from '../compat-schema';

type Definition = (t: Record<string, unknown>) => void;

interface Recorded {
  name?: string;
  type?: string;
  fields: Array<{ name: string; kind?: string; type?: unknown }>;
}

/** A Nexus that writes down what is defined on it. */
const recordingNexus = () => {
  const define = (type: string | undefined, name: string | undefined, definition: Definition) => {
    const recorded: Recorded = { name, type, fields: [] };
    const t: Record<string, unknown> = {};

    t.nonNull = t;

    for (const kind of ['id', 'string', 'boolean']) {
      t[kind] = (field: string) => recorded.fields.push({ name: field, kind });
    }

    t.field = (field: string, config: { type?: unknown }) =>
      recorded.fields.push({ name: field, type: config.type });
    definition(t);

    return recorded;
  };

  return {
    nonNull: (type: string) => `${type}!`,
    objectType: (c: { name: string; definition: Definition }) =>
      define(undefined, c.name, c.definition),
    inputObjectType: (c: { name: string; definition: Definition }) =>
      define(undefined, c.name, c.definition),
    extendType: (c: { type: string; definition: Definition }) =>
      define(c.type, undefined, c.definition),
  };
};

const profileSchema = {
  uid: PROFILE_UID,
  attributes: {
    user: { type: 'relation', relation: 'oneToOne', target: 'plugin::end-users.user' },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
    company: { type: 'string' },
    age: { type: 'integer' },
    prefs: { type: 'json' },
    passcode: { type: 'password' },
    secretNote: { type: 'string', private: true },
    avatar: { type: 'media', multiple: false },
    email: { type: 'string' },
  },
};

const disableMutations = vi.fn();
const makeExtension = () => ({
  use: vi.fn(),
  shadowCRUD: vi.fn(() => ({ disableMutations })),
});

type Extension = ReturnType<typeof makeExtension>;

const strapiOf = (opts: { graphql?: boolean; extension?: Extension } = {}) =>
  ({
    plugin: (name: string) =>
      name === 'graphql' && opts.graphql !== false
        ? {
            service: (service: string) =>
              service === 'extension'
                ? (opts.extension ?? makeExtension())
                : {
                    mappers: {
                      strapiScalarToGraphQLScalar: (type: string) =>
                        ({ string: 'String', integer: 'Int', json: 'JSON' })[type],
                    },
                  },
          }
        : undefined,
    contentType: () => profileSchema,
  }) as unknown as Core.Strapi;

// Core's private-attribute check reads the global's configuration
beforeEach(() => {
  vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the users-permissions GraphQL schema', () => {
  it('registers no operation and no UsersPermissions type with compat off', () => {
    const extension = makeExtension();

    registerCompatGraphql(strapiOf({ extension }), false);

    expect(extension.use).not.toHaveBeenCalled();
    expect(extension.shadowCRUD).not.toHaveBeenCalled();
  });

  it('registers nothing without the GraphQL plugin', () => {
    expect(() => registerCompatGraphql(strapiOf({ graphql: false }), true)).not.toThrow();
  });

  it('registers the types, me and the mutations with compat on', () => {
    const extension = makeExtension();

    registerCompatGraphql(strapiOf({ extension }), true);

    expect(extension.use).toHaveBeenCalledTimes(1);
    expect(extension.shadowCRUD).toHaveBeenCalledWith('plugin::end-users.role');
    expect(disableMutations).toHaveBeenCalled();

    const { types, resolversConfig } = extension.use.mock.calls[0][0]({ nexus: recordingNexus() });
    const byName = (name: string) => types.find((type: Recorded) => type.name === name);
    const operations = (type: string) =>
      types
        .filter((each: Recorded) => each.type === type)
        .flatMap((each: Recorded) => each.fields.map((field) => field.name));

    expect(types.map((type: Recorded) => type.name).filter(Boolean)).toEqual([
      'UsersPermissionsLoginInput',
      'UsersPermissionsRegisterInput',
      'UsersPermissionsPasswordPayload',
      'UsersPermissionsLoginPayload',
      'UsersPermissionsMeRole',
      'UsersPermissionsMe',
    ]);
    expect(operations('Mutation')).toEqual([
      'login',
      'register',
      'forgotPassword',
      'resetPassword',
      'changePassword',
      'emailConfirmation',
    ]);
    expect(operations('Query')).toEqual(['me']);
    expect(
      byName('UsersPermissionsLoginPayload').fields.map((f: { name: string }) => f.name)
    ).toEqual(['jwt', 'user']);
    expect(resolversConfig).toEqual(compatResolversConfig());
    expect(Object.keys(resolversConfig).sort()).toEqual([
      'Mutation.emailConfirmation',
      'Mutation.forgotPassword',
      'Mutation.login',
      'Mutation.register',
      'Mutation.resetPassword',
    ]);
  });

  it("adds the profile's scalar fields to the me type, and no other attribute", () => {
    const extension = makeExtension();

    registerCompatGraphql(strapiOf({ extension }), true);

    const { types } = extension.use.mock.calls[0][0]({ nexus: recordingNexus() });
    const me = types.find((type: Recorded) => type.name === 'UsersPermissionsMe');

    expect(me.fields.map((field: { name: string }) => field.name)).toEqual([
      'id',
      'documentId',
      'username',
      'email',
      'confirmed',
      'blocked',
      'role',
      'company',
      'age',
      'prefs',
    ]);
  });
});

describe('profileScalarFields', () => {
  it('keeps the public scalars the profile adds: no link, timestamp, password, private field, media or name the user has', () => {
    expect(profileScalarFields(strapiOf())).toEqual([
      { name: 'company', type: 'String' },
      { name: 'age', type: 'Int' },
      { name: 'prefs', type: 'JSON' },
    ]);
  });
});
