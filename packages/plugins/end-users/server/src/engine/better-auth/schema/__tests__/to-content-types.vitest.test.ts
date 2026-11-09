import { afterEach, describe, expect, it } from 'vitest';
import { getAuthTables } from 'better-auth/db';
import { admin, jwt, twoFactor, username } from 'better-auth/plugins';
// `@strapi/database` exports `Identifiers` as a type only: the singleton Strapi names every index
// with is reachable at runtime as `strapi.db.metadata.identifiers`, and from a test only by path.
// These are the real helpers, so the names asserted below are the ones Strapi would generate.
import { attributeNaming } from '@strapi/database';
import { identifiers } from '@strapi/database/dist/utils/identifiers';

import type { Core } from '@strapi/types';

import { lockout } from '../../plugins/lockout';
import type { EngineTable } from '../../../types';
import {
  ACCOUNT_UID,
  PLUGIN_ID,
  RATE_LIMIT_UID,
  ROLE_UID,
  SESSION_UID,
  TWO_FACTOR_UID,
  USER_UID,
  VERIFICATION_UID,
} from '../../../../constants';
import { fromAuthTables } from '../from-auth-tables';
import { PRIVATE_FIELDS, READ_ONLY_FIELDS } from '../private-fields';
import { LEGACY_USER_ATTRIBUTES } from '../../../../compat/legacy-confirmation';
import { toContentTypes } from '../to-content-types';

type Json = Record<string, unknown>;

// What Strapi's database layer provides at runtime as `strapi.db.metadata`.
const naming = { identifiers, naming: attributeNaming };

/**
 * Better Auth's own `getAuthTables` output for the core tables and the username, twoFactor, admin,
 * jwt and lockout plugins, with the database rate limiter on, so that every table the plugin generates is
 * covered (apart from passkey, below).
 */
const authTables = fromAuthTables(
  getAuthTables({
    plugins: [username(), twoFactor(), admin(), jwt(), lockout({} as Core.Strapi)],
    rateLimit: { storage: 'database' },
  })
);

/**
 * `@better-auth/passkey` is not loadable in this checkout (its peer packages are not declared yet),
 * so this is its schema, copied from `@better-auth/passkey/dist/index.mjs` (`const schema`).
 */
const passkeyTable: EngineTable = {
  name: 'passkey',
  fields: {
    name: { type: 'string', required: false },
    publicKey: { type: 'string', required: true },
    userId: {
      type: 'string',
      required: true,
      references: { model: 'user', field: 'id' },
      index: true,
    },
    credentialID: { type: 'string', required: true, index: true },
    counter: { type: 'number', required: true },
    deviceType: { type: 'string', required: true },
    backedUp: { type: 'boolean', required: true },
    transports: { type: 'string', required: false },
    createdAt: { type: 'date', required: false },
    aaguid: { type: 'string', required: false },
  },
};

const fixtureTables = [...authTables, passkeyTable];

describe('toContentTypes', () => {
  const cts = toContentTypes(fixtureTables, naming);

  const attributesOf = (name: string) =>
    cts[name].schema.attributes as unknown as Record<string, Json>;
  const indexesOf = (name: string) =>
    (cts[name].schema.indexes ?? []) as Array<{ name: string; columns: string[]; type?: string }>;
  const pluginOptionsOf = (name: string) => (cts[name].schema.pluginOptions ?? {}) as Json;

  it('declares the five carried columns, private and hidden, only with compat on', () => {
    const carried = Object.keys(LEGACY_USER_ATTRIBUTES);
    const withCompat = toContentTypes(fixtureTables, naming, true).user.schema
      .attributes as unknown as Record<string, Json>;

    expect(carried.sort((a, b) => a.localeCompare(b))).toEqual([
      'blocked',
      'confirmationToken',
      'confirmed',
      'password',
      'provider',
    ]);

    for (const name of carried) {
      expect(withCompat[name]).toMatchObject({
        private: true,
        visible: false,
        configurable: false,
      });
      expect(attributesOf('user')[name]).toBeUndefined();
    }

    expect(withCompat.password.type).toBe('password');
    expect(withCompat.provider.type).toBe('string');
    expect(withCompat.confirmed).toMatchObject({ type: 'boolean', default: false });
  });

  it('names tables eu_* and uids plugin::end-users.*', () => {
    expect(cts.user.schema.collectionName).toBe('eu_users');
    expect(cts.session.schema.collectionName).toBe('eu_sessions');
    expect(cts['two-factor'].schema.collectionName).toBe('eu_two_factors');
    expect(cts['rate-limit'].schema.collectionName).toBe('eu_rate_limits');
    expect(cts.jwk.schema.collectionName).toBe('eu_jwks');
  });

  it('keys the content types by singular name, which is what the uid is built from', () => {
    expect(Object.keys(cts).sort()).toEqual([
      'account',
      'jwk',
      'passkey',
      'rate-limit',
      'session',
      'two-factor',
      'user',
      'verification',
    ]);

    for (const [key, ct] of Object.entries(cts)) {
      expect(ct.schema.info.singularName).toBe(key);
      expect(ct.schema.kind).toBe('collectionType');
    }

    // The uid the plugin loader will give each type is `plugin::<plugin id>.<key>`.
    expect(`plugin::${PLUGIN_ID}.user`).toBe(USER_UID);
    expect(`plugin::${PLUGIN_ID}.session`).toBe(SESSION_UID);
    expect(`plugin::${PLUGIN_ID}.account`).toBe(ACCOUNT_UID);
    expect(`plugin::${PLUGIN_ID}.verification`).toBe(VERIFICATION_UID);
    expect(`plugin::${PLUGIN_ID}.two-factor`).toBe(TWO_FACTOR_UID);
    expect(`plugin::${PLUGIN_ID}.rate-limit`).toBe(RATE_LIMIT_UID);
  });

  it('gives every content type a plural name that differs from its singular name', () => {
    // The Content-Type Builder refuses it, and GraphQL would name the single and the list query alike
    for (const [key, ct] of Object.entries(cts)) {
      expect(ct.schema.info.pluralName, key).not.toBe(ct.schema.info.singularName);
    }

    expect(cts.jwk.schema.info).toMatchObject({ singularName: 'jwk', pluralName: 'jwks' });
  });

  it('keeps the table name of the JSON Web Key Set', () => {
    expect(cts.jwk.schema.collectionName).toBe('eu_jwks');
  });

  it('never emits an id attribute: documentId is the id', () => {
    for (const ct of Object.values(cts)) expect(ct.schema.attributes.id).toBeUndefined();
  });

  it('leaves the timestamps to Strapi', () => {
    for (const name of Object.keys(cts)) {
      expect(attributesOf(name).createdAt).toBeUndefined();
      expect(attributesOf(name).updatedAt).toBeUndefined();
    }
  });

  it('generates the user`s preferredLocale and last sign-in date, and leaves Strapi`s own locale to i18n', () => {
    const generated = toContentTypes(
      [
        {
          name: 'user',
          fields: {
            email: { type: 'string', required: true },
            preferredLocale: { type: 'string', required: false },
            locale: { type: 'string', required: false },
            lastSignInAt: { type: 'date', required: false },
          },
        },
      ] as never,
      naming
    );
    const user = generated.user.schema.attributes as unknown as Record<string, Json>;

    // A plain, grantable string: a short column, not private, not read-only
    expect(user.preferredLocale).toMatchObject({ type: 'string' });
    expect(user.preferredLocale.private).toBeUndefined();
    expect(user.preferredLocale.writable).toBeUndefined();
    expect(user.lastSignInAt).toMatchObject({ type: 'datetime' });
    // `locale` is Strapi-managed: never generated
    expect(user.locale).toBeUndefined();
  });

  it('stores references to user.id as string userId columns with an index', () => {
    expect(attributesOf('session').userId.type).toBe('string');
    expect(indexesOf('session')).toEqual(
      expect.arrayContaining([expect.objectContaining({ columns: ['user_id'] })])
    );

    for (const name of ['session', 'account', 'two-factor', 'passkey']) {
      expect(attributesOf(name).userId.type).toBe('string');
      expect(indexesOf(name).some((index) => index.columns.join() === 'user_id')).toBe(true);
    }
  });

  it('indexes the hot lookups', () => {
    expect(indexesOf('session')).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unique', columns: ['token'] })])
    );
    expect(indexesOf('user')).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unique', columns: ['email'] })])
    );
    expect(indexesOf('user')).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unique', columns: ['username'] })])
    );
    expect(indexesOf('account')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'unique', columns: ['provider_id', 'account_id'] }),
      ])
    );
    expect(indexesOf('verification')).toEqual(
      expect.arrayContaining([expect.objectContaining({ columns: ['identifier'] })])
    );
    expect(indexesOf('rate-limit')).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unique', columns: ['key'] })])
    );
    expect(indexesOf('passkey')).toEqual(
      expect.arrayContaining([expect.objectContaining({ columns: ['credential_id'] })])
    );
  });

  it('allows one two-factor row per user, with a single index on userId', () => {
    const onUserId = indexesOf('two-factor').filter((index) => index.columns.join() === 'user_id');

    expect(onUserId).toHaveLength(1);
    expect(onUserId[0].type).toBe('unique');
  });

  it('declares each unique index once, as an index and not as an attribute flag', () => {
    // `unique: true` on an attribute makes Strapi's database layer add a unique index of its own,
    // under the name this generator would also pick, so the table would be created twice over.
    for (const name of Object.keys(cts)) {
      for (const attribute of Object.values(attributesOf(name))) {
        expect(attribute.unique).toBeUndefined();
      }

      const signatures = indexesOf(name).map((index) => index.columns.join());
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });

  it('names indexes with the database identifiers helpers, uniquely across tables', () => {
    expect(indexesOf('session')).toEqual(
      expect.arrayContaining([
        {
          name: identifiers.getIndexName(['eu_sessions', 'user_id']),
          columns: ['user_id'],
        },
        {
          name: identifiers.getUniqueIndexName(['eu_sessions', 'token']),
          columns: ['token'],
          type: 'unique',
        },
      ])
    );

    const names = Object.keys(cts).flatMap((name) => indexesOf(name).map((index) => index.name));
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only indexes columns that exist on the table', () => {
    for (const name of Object.keys(cts)) {
      const columns = new Set(Object.keys(attributesOf(name)).map(attributeNaming.columnName));

      for (const index of indexesOf(name)) {
        for (const column of index.columns) expect(columns.has(column)).toBe(true);
      }
    }
  });

  it('marks secrets private', () => {
    expect(attributesOf('session').token.private).toBe(true);
    expect(attributesOf('account').password.private).toBe(true);
    expect(attributesOf('account').accessToken.private).toBe(true);
    expect(attributesOf('account').refreshToken.private).toBe(true);
    expect(attributesOf('account').idToken.private).toBe(true);
    expect(attributesOf('two-factor').secret.private).toBe(true);
    expect(attributesOf('two-factor').backupCodes.private).toBe(true);
    expect(attributesOf('verification').identifier.private).toBe(true);
    expect(attributesOf('verification').value.private).toBe(true);
    expect(attributesOf('passkey').publicKey.private).toBe(true);
    expect(attributesOf('jwk').privateKey.private).toBe(true);
  });

  describe('the roles of a user', () => {
    it('are a relation from the user to the role type, owned by the user', () => {
      expect(attributesOf('user').roles).toMatchObject({
        type: 'relation',
        relation: 'manyToMany',
        target: ROLE_UID,
        configurable: false,
      });
    });

    it('are one-way: the role has no inverse, so the user schema is the only side that changes', () => {
      // `boot-checks` refuses a relation to the user that has `inversedBy` or `mappedBy`, and a
      // `role.users` would be exactly that
      expect(attributesOf('user').roles).not.toHaveProperty('inversedBy');
      expect(attributesOf('user').roles).not.toHaveProperty('mappedBy');
    });

    it('are the plugin’s own, on the user and on no other generated type', () => {
      for (const name of Object.keys(cts).filter((key) => key !== 'user')) {
        expect(attributesOf(name).roles, name).toBeUndefined();
      }
    });

    it('do not depend on what the engine tables declare: they are there for any set of tables', () => {
      const minimal = toContentTypes(
        [{ name: 'user', fields: { email: { type: 'string' } } }],
        naming
      );

      expect(
        (minimal.user.schema.attributes as unknown as Record<string, Json>).roles
      ).toMatchObject({ type: 'relation', target: ROLE_UID });
    });

    it('are not private, hidden or required', () => {
      expect(attributesOf('user').roles).not.toHaveProperty('private');
      expect(attributesOf('user').roles).not.toHaveProperty('visible');
      expect(attributesOf('user').roles).not.toHaveProperty('required');
    });
  });

  describe('the moderation fields of Better Auth’s admin plugin', () => {
    // `/api/users/me` answers with the user's own row through Strapi's sanitizers, which drop a
    // private attribute. The ban fields are not the signed-in user's to read there. Better Auth's
    // own responses, its ban check and the plugin's strategy read the stored row, and are unaffected.
    it.each(['banned', 'banReason', 'banExpires'])('%s is private', (field) => {
      expect(attributesOf('user')[field].private).toBe(true);
    });

    it.each(['banned', 'banReason', 'banExpires'])(
      '%s stays in the table, visible to the Content Manager and writable',
      (field) => {
        expect(attributesOf('user')[field]).not.toHaveProperty('visible');
        expect(attributesOf('user')[field]).not.toHaveProperty('writable');
      }
    );

    it.each(['failedSignIns', 'lockedUntil'])(
      'the lockout field %s is private, and neither hidden nor read-only to the Content Manager',
      (field) => {
        expect(attributesOf('user')[field].private).toBe(true);
        expect(attributesOf('user')[field]).not.toHaveProperty('visible');
        expect(attributesOf('user')[field]).not.toHaveProperty('writable');
      }
    );

    it('stores the lockout as an integer and a datetime, both optional', () => {
      expect(attributesOf('user').failedSignIns).toMatchObject({ type: 'integer', default: 0 });
      expect(attributesOf('user').failedSignIns).not.toHaveProperty('required');
      expect(attributesOf('user').lockedUntil).toMatchObject({ type: 'datetime' });
      expect(attributesOf('user').lockedUntil).not.toHaveProperty('required');
    });

    it('are in the fixed private list, so a project cannot switch them off', () => {
      expect(PRIVATE_FIELDS.user).toEqual(
        expect.arrayContaining(['role', 'banned', 'banReason', 'banExpires'])
      );
    });

    it('leaves the five fields writable in the schema, so the Content Manager can edit them', () => {
      // The Content API refuses them with the engine-owned-fields validator, which
      // the Document Service, and so the Content Manager, never runs. A `writable: false` would
      // take them from the Content Manager too.
      for (const field of [
        'emailVerified',
        'twoFactorEnabled',
        'banned',
        'banReason',
        'banExpires',
      ]) {
        expect(attributesOf('user')[field], field).toBeDefined();
        expect(attributesOf('user')[field], field).not.toHaveProperty('writable');
        expect(attributesOf('user')[field], field).not.toHaveProperty('visible');
      }

      expect(READ_ONLY_FIELDS.user).toEqual(['role']);
    });

    it.each(['twoFactorEnabled', 'emailVerified', 'username', 'displayUsername'])(
      'leaves %s returned: a front end reads it',
      (field) => {
        expect(attributesOf('user')[field]).not.toHaveProperty('private');
      }
    );
  });

  describe('the role field of Better Auth’s admin plugin', () => {
    // The plugin's hooks read `user.role`, so the field stays in the table. Strapi roles live in
    // `user.roles`; this one is not an end user's to see, or an editor's to change by hand.
    it('stays in the table, private and hidden from the Content Manager', () => {
      expect(attributesOf('user').role).toMatchObject({
        type: 'string',
        private: true,
        visible: false,
      });
    });

    it('is the only hidden attribute of the user', () => {
      const hidden = Object.entries(attributesOf('user'))
        .filter(([, attribute]) => attribute.visible === false)
        .map(([name]) => name);

      expect(hidden).toEqual(['role']);
    });

    it('hides no attribute of any other type', () => {
      for (const name of Object.keys(cts).filter((key) => key !== 'user')) {
        const hidden = Object.values(attributesOf(name)).filter(
          (attribute) => attribute.visible === false
        );

        expect(hidden, name).toEqual([]);
      }
    });

    it('is read-only: a request can never write it, whatever a role is granted', () => {
      expect(attributesOf('user').role).toMatchObject({ writable: false });
    });

    it('is the only read-only attribute of any generated type', () => {
      for (const name of Object.keys(cts)) {
        const readOnly = Object.entries(attributesOf(name))
          .filter(([, attribute]) => attribute.writable === false)
          .map(([attribute]) => attribute);

        expect(readOnly, name).toEqual(name === 'user' ? ['role'] : []);
      }
    });

    it('leaves the other fields of the user as they were', () => {
      expect(attributesOf('user').email).not.toHaveProperty('visible');
      expect(attributesOf('user').name).not.toHaveProperty('visible');
      expect(attributesOf('user').banned).not.toHaveProperty('visible');
    });
  });

  it('marks every field Better Auth does not return private as well', () => {
    // returned: false in getAuthTables, and not in the fixed list
    expect(attributesOf('account').accessTokenExpiresAt.private).toBe(true);
    expect(attributesOf('two-factor').userId.private).toBe(true);
    expect(attributesOf('two-factor').failedVerificationCount.private).toBe(true);
  });

  describe('when a project renames the fields that hold secrets', () => {
    // Better Auth's own `fields` options: the engine key stays `token`, the attribute becomes
    // `sessionToken`. The secret must stay private under the new name.
    const renamed = toContentTypes(
      fromAuthTables(
        getAuthTables({
          session: { fields: { token: 'sessionToken' } },
          account: {
            fields: {
              password: 'pw',
              accessToken: 'oauthAccess',
              refreshToken: 'oauthRefresh',
              idToken: 'oauthId',
            },
          },
          verification: { fields: { identifier: 'subject', value: 'secretValue' } },
          plugins: [twoFactor({ schema: { twoFactor: { fields: { secret: 'totp' } } } })],
        })
      ),
      naming
    );

    const renamedAttributes = (name: string) =>
      renamed[name].schema.attributes as unknown as Record<string, Json>;

    it('keeps a renamed session token private', () => {
      expect(renamedAttributes('session').token).toBeUndefined();
      expect(renamedAttributes('session').sessionToken.private).toBe(true);
    });

    it('keeps renamed account secrets private', () => {
      expect(renamedAttributes('account').password).toBeUndefined();
      expect(renamedAttributes('account').pw.private).toBe(true);
      expect(renamedAttributes('account').oauthAccess.private).toBe(true);
      expect(renamedAttributes('account').oauthRefresh.private).toBe(true);
      expect(renamedAttributes('account').oauthId.private).toBe(true);
    });

    it('does not depend on the engine marking the field returned: false', () => {
      // Better Auth marks account.password `returned: false` today; the fixed list must hold alone.
      const { account } = toContentTypes(
        [
          {
            name: 'account',
            fields: {
              password: { type: 'string', required: false, fieldName: 'pw' },
              accessToken: { type: 'string', required: false, fieldName: 'oauthAccess' },
            },
          },
        ],
        naming
      );
      const attributes = account.schema.attributes as unknown as Record<string, Json>;

      expect(attributes.pw.private).toBe(true);
      expect(attributes.oauthAccess.private).toBe(true);
    });

    it('keeps renamed verification and two-factor secrets private', () => {
      expect(renamedAttributes('verification').subject.private).toBe(true);
      expect(renamedAttributes('verification').secretValue.private).toBe(true);
      expect(renamedAttributes('two-factor').totp.private).toBe(true);
    });

    it('still indexes a renamed field under its new column', () => {
      expect(renamed.session.schema.indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'unique', columns: ['session_token'] }),
        ])
      );
    });
  });

  it('keeps the fixed private list in step with what is generated', () => {
    for (const [name, fields] of Object.entries(PRIVATE_FIELDS)) {
      for (const field of fields) expect(attributesOf(name)[field]).toBeDefined();
    }
  });

  it('leaves public fields public', () => {
    expect(attributesOf('user').email.private).toBeUndefined();
    expect(attributesOf('user').name.private).toBeUndefined();
    expect(attributesOf('session').userId.private).toBeUndefined();
    expect(attributesOf('session').expiresAt.private).toBeUndefined();
  });

  it('locks the user type and allows only one-way relations to it', () => {
    const opts = pluginOptionsOf('user');
    expect(opts['content-type-builder']).toEqual({
      visible: false,
      restrictRelationsTo: ['oneWay', 'manyWay'],
    });
    expect(opts['content-manager']).toEqual({ visible: true });
  });

  it('names the user type for GraphQL, and no other generated type', () => {
    expect(pluginOptionsOf('user').graphql).toEqual({
      typeName: { singular: 'EndUser', plural: 'EndUsers' },
    });

    for (const name of Object.keys(cts).filter((key) => key !== 'user')) {
      expect(pluginOptionsOf(name)).not.toHaveProperty('graphql');
    }
  });

  it('hides every other generated type from both builders', () => {
    for (const name of Object.keys(cts).filter((key) => key !== 'user')) {
      expect(pluginOptionsOf(name)['content-manager']).toEqual({ visible: false });
      expect(pluginOptionsOf(name)['content-type-builder']).toEqual({ visible: false });
    }
  });

  it('turns off draft and publish and i18n', () => {
    for (const ct of Object.values(cts)) {
      expect(ct.schema.options?.draftAndPublish).toBe(false);
      expect((ct.schema.pluginOptions as Json).i18n).toEqual({ localized: false });
    }
  });

  it('maps field types', () => {
    expect(attributesOf('user').email.type).toBe('email');
    expect(attributesOf('user').emailVerified).toMatchObject({ type: 'boolean', default: false });
    expect(attributesOf('session').expiresAt.type).toBe('datetime');
    expect(attributesOf('rate-limit').count.type).toBe('integer');
    expect(attributesOf('rate-limit').lastRequest.type).toBe('biginteger');
    expect(attributesOf('passkey').backedUp.type).toBe('boolean');
  });

  it('uses varchar for short or indexed strings and long text for the rest', () => {
    // indexed or sorted: must be a varchar, MySQL cannot index a text column
    expect(attributesOf('session').token.type).toBe('string');
    expect(attributesOf('user').name.type).toBe('string');
    expect(attributesOf('user').username.type).toBe('string');
    expect(attributesOf('account').providerId.type).toBe('string');
    expect(attributesOf('account').accountId.type).toBe('string');
    expect(attributesOf('verification').identifier.type).toBe('string');
    expect(attributesOf('session').ipAddress.type).toBe('string');
    // unbounded: user agents, OAuth tokens, keys and stored values can be longer than 255
    expect(attributesOf('session').userAgent.type).toBe('text');
    expect(attributesOf('account').accessToken.type).toBe('text');
    expect(attributesOf('account').idToken.type).toBe('text');
    expect(attributesOf('verification').value.type).toBe('text');
    expect(attributesOf('jwk').publicKey.type).toBe('text');
  });

  it('carries required, and leaves optional fields optional', () => {
    expect(attributesOf('session').userId.required).toBe(true);
    expect(attributesOf('session').token.required).toBe(true);
    expect(attributesOf('session').ipAddress.required).toBeUndefined();
    expect(attributesOf('user').image.required).toBeUndefined();
  });

  it('generates the fields of the Better Auth plugins that are on', () => {
    expect(Object.keys(attributesOf('user'))).toEqual(
      expect.arrayContaining([
        'username',
        'displayUsername',
        'twoFactorEnabled',
        'role',
        'banned',
        'banReason',
        'banExpires',
      ])
    );
    expect(attributesOf('session').impersonatedBy).toBeDefined();
  });

  it('puts the attributes where the engine stores them, under the configured field name', () => {
    const { widget } = toContentTypes(
      [
        {
          name: 'widget',
          fields: {
            ownerId: {
              type: 'string',
              fieldName: 'customerId',
              references: { model: 'user', field: 'id' },
            },
          },
        },
      ],
      naming
    );

    expect(Object.keys(widget.schema.attributes)).toEqual(['customerId']);
    expect(widget.schema.indexes).toEqual([expect.objectContaining({ columns: ['customer_id'] })]);
  });

  it('turns table-level indexes into column indexes', () => {
    const { widget } = toContentTypes(
      [
        {
          name: 'widget',
          fields: { a: { type: 'string' }, bToo: { type: 'string' } },
          indexes: [{ fields: ['a', 'bToo'], unique: true }, { fields: ['bToo'] }],
        },
      ],
      naming
    );

    expect(widget.schema.indexes).toEqual([
      expect.objectContaining({ type: 'unique', columns: ['a', 'b_too'] }),
      expect.objectContaining({ columns: ['b_too'] }),
    ]);
  });

  it('prefers a unique index over a plain one on the same columns', () => {
    const { widget } = toContentTypes(
      [
        {
          name: 'widget',
          fields: { code: { type: 'string', index: true } },
          indexes: [{ fields: ['code'], unique: true }],
        },
      ],
      naming
    );

    expect(widget.schema.indexes).toEqual([
      expect.objectContaining({ type: 'unique', columns: ['code'] }),
    ]);
  });

  it('skips tables the engine does not want created', () => {
    const generated = toContentTypes(
      [{ name: 'widget', fields: { a: { type: 'string' } }, disableMigrations: true }],
      naming
    );

    expect(generated).toEqual({});
  });

  it('builds enumerations from array types', () => {
    const { widget } = toContentTypes(
      [{ name: 'widget', fields: { kind: { type: ['small', 'large'], defaultValue: 'small' } } }],
      naming
    );

    expect(widget.schema.attributes.kind).toMatchObject({
      type: 'enumeration',
      enum: ['small', 'large'],
      default: 'small',
    });
  });

  it('ignores computed defaults', () => {
    const { widget } = toContentTypes(
      [{ name: 'widget', fields: { at: { type: 'date', defaultValue: () => new Date() } } }],
      naming
    );

    expect(
      (widget.schema.attributes as unknown as Record<string, Json>).at.default
    ).toBeUndefined();
  });

  describe('without a naming argument', () => {
    afterEach(() => {
      delete (globalThis as Json).strapi;
    });

    it('uses strapi.db.metadata', () => {
      (globalThis as Json).strapi = { db: { metadata: naming } };

      const { session } = toContentTypes(fixtureTables.filter((table) => table.name === 'session'));

      expect(session.schema.indexes).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'unique', columns: ['token'] })])
      );
    });
  });
});
