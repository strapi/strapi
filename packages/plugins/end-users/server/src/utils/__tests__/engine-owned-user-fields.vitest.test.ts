import { describe, expect, it } from 'vitest';
import { validate } from '@strapi/utils';
import type { Struct } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../constants';
import {
  ENGINE_OWNED_USER_FIELDS,
  REQUEST_NEVER_WRITES_USER_RELATIONS,
  engineOwnedUserFieldsValidator,
} from '../engine-owned-user-fields';

const OWNED = [
  'emailVerified',
  'twoFactorEnabled',
  'banned',
  'banReason',
  'banExpires',
  'failedSignIns',
  'lockedUntil',
  'lastSignInAt',
  'legacyTokensRevokedAt',
] as const;

/** The end-user type as far as these checks read it */
const USER_SCHEMA = {
  uid: USER_UID,
  modelType: 'contentType',
  kind: 'collectionType',
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  attributes: {
    name: { type: 'string' },
    email: { type: 'email' },
    emailVerified: { type: 'boolean' },
    twoFactorEnabled: { type: 'boolean' },
    banned: { type: 'boolean' },
    banReason: { type: 'string' },
    banExpires: { type: 'datetime' },
    failedSignIns: { type: 'integer' },
    lockedUntil: { type: 'datetime' },
    lastSignInAt: { type: 'datetime' },
    legacyTokensRevokedAt: { type: 'datetime' },
    roles: { type: 'relation', relation: 'manyToMany', target: 'plugin::end-users.role' },
  },
} as unknown as Struct.ContentTypeSchema;

/** Another type that happens to have attributes of the same names */
const PROFILE_SCHEMA = {
  ...USER_SCHEMA,
  uid: PROFILE_UID,
  info: { singularName: 'profile', pluralName: 'profiles', displayName: 'Profile' },
} as unknown as Struct.ContentTypeSchema;

const VALUES: Record<(typeof OWNED)[number], unknown> = {
  emailVerified: true,
  twoFactorEnabled: false,
  banned: false,
  banReason: 'none',
  banExpires: null,
  failedSignIns: 0,
  lockedUntil: null,
  lastSignInAt: null,
  legacyTokensRevokedAt: null,
};

/**
 * As a registry function runs: the schema, then the data (core also hands it the auth and action).
 * The data is anything a body can carry, a null or an object with an inherited key included.
 */
const run = (schema: Struct.ContentTypeSchema, data: unknown) =>
  engineOwnedUserFieldsValidator(schema)(data as never);

describe('the engine-owned user fields', () => {
  it('are the fields Better Auth and the plugin write', () => {
    expect(ENGINE_OWNED_USER_FIELDS).toEqual(OWNED);
    expect(Object.isFrozen(ENGINE_OWNED_USER_FIELDS)).toBe(true);
  });

  it('refuses the engine-owned user fields on Content API input and ignores other types', async () => {
    for (const field of OWNED) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        run(USER_SCHEMA, { name: 'A', [field]: VALUES[field] }),
        field
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: `${field} can only be changed by the plugin`,
        details: { key: field, path: field },
      });
    }

    // Another type's attributes of the same names are that type's own
    const profile = { banned: true, emailVerified: true };

    await expect(run(PROFILE_SCHEMA, profile)).resolves.toBe(profile);
  });

  it('refuses roles in any form on create and on update, and ignores other types with a roles attribute', async () => {
    expect(REQUEST_NEVER_WRITES_USER_RELATIONS).toEqual(['roles']);

    const forms = [
      ['an array of ids', ['role-doc-id']],
      ['an array of objects', [{ documentId: 'role-doc-id' }]],
      ['connect', { connect: ['role-doc-id'] }],
      ['disconnect', { disconnect: [{ documentId: 'role-doc-id' }] }],
      ['set', { set: [{ documentId: 'role-doc-id' }] }],
      ['an empty array', []],
      ['an empty set', { set: [] }],
      ['null', null],
    ] as const;

    const validators = validate.createAPIValidators({
      getModel: (uid: string) =>
        ({ [USER_UID]: USER_SCHEMA, [PROFILE_UID]: PROFILE_SCHEMA })[uid] as never,
      validators: { input: [engineOwnedUserFieldsValidator] },
    });

    for (const action of ['create', 'update'] as const) {
      for (const [form, roles] of forms) {
        // eslint-disable-next-line no-await-in-loop
        await expect(
          validators.input({ name: 'A', roles }, USER_SCHEMA, { action }),
          `${action}: ${form}`
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'roles can only be changed by the plugin',
        });
      }
    }

    await expect(run(USER_SCHEMA, { roles: [] })).rejects.toMatchObject({
      details: { key: 'roles', path: 'roles' },
    });

    const profile = { roles: ['x'] };

    await expect(run(PROFILE_SCHEMA, profile)).resolves.toBe(profile);
  });

  it('lets the rest of a user body through, unchanged', async () => {
    const data = { name: 'A', username: 'a' };

    await expect(run(USER_SCHEMA, data)).resolves.toBe(data);
  });

  it('refuses an email on a write of an existing user, and takes it on a create', async () => {
    const validators = validate.createAPIValidators({
      getModel: (uid: string) =>
        ({ [USER_UID]: USER_SCHEMA, [PROFILE_UID]: PROFILE_SCHEMA })[uid] as never,
      validators: { input: [engineOwnedUserFieldsValidator] },
    });

    await expect(
      validators.input({ email: 'a@example.com' }, USER_SCHEMA, { action: 'update' })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'email can only be changed through /change-email',
      details: { key: 'email', path: 'email' },
    });
    await expect(
      validators.input({ email: 'a@example.com' }, USER_SCHEMA, { action: 'create' })
    ).resolves.toBeUndefined();
    await expect(
      validators.input({ email: 'a@example.com' }, PROFILE_SCHEMA, { action: 'update' })
    ).resolves.toBeUndefined();
  });

  it('refuses a field that is there, whatever its value, and leaves what is not an object alone', async () => {
    await expect(run(USER_SCHEMA, { banned: null })).rejects.toMatchObject({
      message: 'banned can only be changed by the plugin',
    });
    // An inherited key is not in the body
    await expect(run(USER_SCHEMA, Object.create({ banned: true }))).resolves.toBeDefined();
    await expect(run(USER_SCHEMA, null)).resolves.toBeNull();
  });

  it('declares its parameters, so core hands it the auth and the action', () => {
    expect(engineOwnedUserFieldsValidator.length).toBeGreaterThan(0);
  });

  it("refuses them through core's own input validation of the Content API", async () => {
    const validators = validate.createAPIValidators({
      getModel: (uid: string) =>
        ({ [USER_UID]: USER_SCHEMA, [PROFILE_UID]: PROFILE_SCHEMA })[uid] as never,
      validators: { input: [engineOwnedUserFieldsValidator] },
    });

    await expect(
      validators.input({ name: 'A', banned: true }, USER_SCHEMA, { action: 'update' })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'banned can only be changed by the plugin',
    });
    await expect(
      validators.input({ name: 'A' }, USER_SCHEMA, { action: 'update' })
    ).resolves.toBeUndefined();
    await expect(
      validators.input({ banned: true }, PROFILE_SCHEMA, { action: 'update' })
    ).resolves.toBeUndefined();
  });
});
