import knex, { type Knex } from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPAT_ROWS } from '../../compat/rows';
import {
  buildReport,
  CODE_FINDING_SEVERITY,
  estimateMinutes,
  ITEM_SEVERITY,
  MEASURED_MS_PER_1000_USERS,
  nullableOnGraphql,
  pendingLinkItem,
  requiredOnGraphql,
} from '../report';
import type { ReportContext } from '../report';
import { duplicatesQuery, readUpSnapshot } from '../snapshot';
import type { UpSnapshot } from '../snapshot';

// Runtime-built, so no secret-shaped literal sits in the source
const SECRET = ['s', 'e', 'c', 'r', 'e', 't'].join('') + Date.now().toString(36);
const EMAIL = 'Alice@Example.com';
const USERNAME = 'Alice';

const emptySnapshot = (): UpSnapshot => ({
  tables: [
    'up_users',
    'up_roles',
    'up_permissions',
    'up_users_role_lnk',
    'up_permissions_role_lnk',
  ],
  users: {
    total: 0,
    local: 0,
    byProvider: {},
    unconfirmed: 0,
    blocked: 0,
    nullDocumentIds: 0,
    pendingResets: 0,
    pendingConfirmations: 0,
  },
  duplicateEmails: [],
  duplicateUsernames: [],
  duplicateRoleNames: [],
  usernames: { nativeRefused: [], withAt: [] },
  roles: [],
  store: { grant: null, email: null, advanced: null },
  apiTokens: [],
  adminPermissions: [],
  notNullColumns: [],
  euUsersRows: null,
});

const context = (over: Partial<ReportContext> = {}): ReportContext => ({
  source: 'check',
  client: 'sqlite',
  compat: true,
  now: new Date('2026-11-09T10:00:00Z'),
  permissionContext: {
    compat: true,
    contentTypes: { 'api::article.article': { draftAndPublish: true } },
    fields: () => ['title'],
    isKnownAction: () => true,
  },
  requiredProviderFields: () => [],
  graphqlNullable: [],
  graphqlRequired: null,
  configKeys: [],
  codeFindings: [],
  ...over,
});

const find = (report: ReturnType<typeof buildReport>, id: string) =>
  report.items.find((entry) => entry.id === id);

describe('buildReport', () => {
  it('reports each duplicate email group with the kept and rewritten ids and no address', () => {
    const snapshot = emptySnapshot();
    snapshot.duplicateEmails = [
      { keep: 3, rewrite: [8, 9] },
      { keep: 4, rewrite: [10] },
    ];

    const entry = find(buildReport(snapshot, context()), 'duplicate-email:all');

    expect(entry).toMatchObject({ severity: 'action', count: 2, refs: ['3:8,9', '4:10'] });
    expect(entry?.message).not.toContain('@');
  });

  it('names that email is no longer writable through /api/users, with the roles that held user.update', () => {
    const snapshot = emptySnapshot();
    snapshot.roles = [
      {
        id: 1,
        name: 'a',
        type: 'authenticated',
        actions: ['plugin::users-permissions.user.update'],
        users: 1,
      },
      {
        id: 2,
        name: 'b',
        type: 'public',
        actions: ['plugin::users-permissions.user.find'],
        users: 0,
      },
    ];

    const entry = find(buildReport(snapshot, context()), 'user-email-read-only:all');

    expect(entry).toMatchObject({ severity: 'info', refs: [1], count: 1 });
    expect(entry?.message).toContain('PUT /api/users/:id');
  });

  it('reports each provider as mapped, needing input or not supported', () => {
    const snapshot = emptySnapshot();
    snapshot.users.byProvider = { local: 4, github: 2, twitter: 1, instagram: 0 };
    snapshot.store.grant = {
      github: { enabled: true, key: 'id', secret: 'x' },
      google: { enabled: true, key: 'id' },
      twitter: { enabled: true, key: 'id', secret: 'x' },
      instagram: { enabled: true, key: 'id', secret: 'x' },
    };

    const report = buildReport(snapshot, context());

    expect(find(report, 'provider-needs-input:google')?.severity).toBe('action');
    expect(find(report, 'provider-needs-input:twitter')?.severity).toBe('action');
    expect(find(report, 'provider-not-supported:instagram')?.severity).toBe('action');
    expect(find(report, 'provider-needs-input:github')).toBeUndefined();
    expect(find(report, 'provider-users:github')).toMatchObject({ count: 2, severity: 'info' });
    expect(find(report, 'provider-users:github')?.message).toContain(
      '/api/connect/github/callback'
    );
    expect(report.counts.providerUsers).toEqual({ github: 2, twitter: 1, instagram: 0 });
  });

  it('says the users of a provider that never verifies an address get a pending link, and the others do not', () => {
    const snapshot = emptySnapshot();
    snapshot.users.byProvider = { local: 1, facebook: 3, github: 2 };

    const report = buildReport(snapshot, context());
    const facebook = find(report, 'provider-users:facebook')?.message;
    const github = find(report, 'provider-users:github')?.message;

    expect(facebook).toContain('never says an address is verified');
    expect(facebook).toContain(
      'Each one who confirmed their address and is not blocked gets a pending link'
    );
    expect(facebook).toContain('until compatibility mode is turned off');
    expect(github).toContain('as long as github reports the address as verified');
    expect(github).not.toContain('pending link');
  });

  it('counts the pending links by provider, as information with no address in it', () => {
    expect(pendingLinkItem({})).toBeNull();
    expect(pendingLinkItem({ github: 0 })).toBeNull();

    const pending = pendingLinkItem({ vk: 5, facebook: 1 });

    expect(pending).toMatchObject({
      id: 'provider-pending-links:all',
      kind: 'provider-pending-links',
      severity: 'info',
      count: 6,
      refs: ['facebook', 'vk'],
      resolved: false,
    });
    expect(pending?.message).toContain(
      '6 users who signed up with a provider that never says an address is verified have a pending link'
    );
    expect(pending?.message).toContain('facebook: 1, vk: 5');
    expect(pending?.message).toContain('dropped when compatibility mode is turned off');
    expect(pendingLinkItem({ facebook: 1 })?.message).toContain('verified has a pending link');
  });

  it('reports the permissions each role loses or changes', () => {
    const snapshot = emptySnapshot();
    snapshot.roles = [
      {
        id: 7,
        name: 'r',
        type: 'authenticated',
        actions: [
          'plugin::users-permissions.auth.register',
          'plugin::users-permissions.user.update',
          'api::article.article.find',
          'api::later.later.find',
        ],
        users: 3,
      },
    ];
    let known: boolean | null = null;

    const report = buildReport(
      snapshot,
      context({
        permissionContext: { ...context().permissionContext, isKnownAction: () => known },
      })
    );

    expect(find(report, 'permission-dropped:7')).toMatchObject({
      count: 1,
      refs: ['plugin::users-permissions.auth.register'],
    });
    expect(find(report, 'permission-dropped:7')?.message).toContain('1 more');
    expect(find(report, 'permission-changed:7')).toMatchObject({ count: 2 });

    known = true;
    expect(find(buildReport(snapshot, context()), 'permission-dropped:7')?.count).toBe(1);
  });

  it('carries a note for every compat row that has one', () => {
    const report = buildReport(emptySnapshot(), context());
    const notes = report.items.filter((entry) => entry.kind === 'compat-note');
    const first = COMPAT_ROWS.find((row) => row.note && row.break);

    expect(notes).toHaveLength(COMPAT_ROWS.filter((row) => row.note).length);
    expect(find(report, `compat-note:${first?.row}`)?.message.startsWith(first?.break ?? '')).toBe(
      true
    );
    expect(
      buildReport(emptySnapshot(), context({ compat: false })).items.some(
        (i) => i.kind === 'compat-note'
      )
    ).toBe(false);
  });

  it('marks the action kinds and leaves every other kind informational', () => {
    const actions = Object.entries(ITEM_SEVERITY)
      .filter(([, severity]) => severity === 'action')
      .map(([kind]) => kind);

    expect(actions.sort((a, b) => a.localeCompare(b))).toEqual(
      [
        'duplicate-email',
        'provider-needs-input',
        'provider-not-supported',
        'template-untranslated',
        'api-token',
        'staged-undeclared',
        'not-null-column',
      ].sort((a, b) => a.localeCompare(b))
    );

    const snapshot = emptySnapshot();
    const report = buildReport(
      snapshot,
      context({
        codeFindings: [
          { path: 'src/a.ts', line: 3, rule: 'lifecycle', message: 'm' },
          { path: 'src/b.ts', line: null, rule: 'old-uid', message: 'm' },
          { path: 'src/c.ts', line: 1, rule: 'inverse-dropped', message: 'm' },
        ],
      })
    );

    expect(find(report, 'code-finding:lifecycle')?.severity).toBe('action');
    expect(find(report, 'code-finding:old-uid')?.severity).toBe('info');
    expect(find(report, 'inverse-dropped:inverse-dropped')?.severity).toBe('info');
    expect(Object.entries(CODE_FINDING_SEVERITY).filter(([, s]) => s === 'action')).toHaveLength(5);
  });

  it('puts no address, username or secret in any message', () => {
    const snapshot = emptySnapshot();
    snapshot.users = { ...snapshot.users, total: 1, local: 1, byProvider: { local: 1 } };
    snapshot.duplicateEmails = [{ keep: 1, rewrite: [2] }];
    snapshot.usernames = { nativeRefused: [1], withAt: [1] };
    snapshot.store.grant = { github: { enabled: true, key: 'id', secret: SECRET } };
    snapshot.store.email = {
      reset_password: {
        options: { object: USERNAME, message: `<p>${EMAIL} <%= ${SECRET} %></p>` },
      },
    };

    const json = JSON.stringify(buildReport(snapshot, context()));

    for (const value of [EMAIL, EMAIL.toLowerCase(), USERNAME, SECRET]) {
      expect(json).not.toContain(value);
    }
  });

  it('lists the other groups once each', () => {
    const snapshot = emptySnapshot();
    snapshot.notNullColumns = ['company'];
    snapshot.apiTokens = [{ id: 5, actions: ['plugin::users-permissions.user.find'] }];
    snapshot.adminPermissions = [
      { id: 1, roleId: 2, action: 'plugin::users-permissions.roles.read', subject: null },
    ];
    snapshot.users = { ...snapshot.users, pendingResets: 2, pendingConfirmations: 1 };

    const report = buildReport(
      snapshot,
      context({
        graphqlNullable: [{ uid: 'plugin::end-users.user', fields: ['company'] }],
        configKeys: ['jwtSecret', 'nope'],
      })
    );

    for (const id of [
      'not-null-column:all',
      'api-token:all',
      'admin-permission:all',
      'pending-tokens:all',
      'graphql-nullable:all',
      'layout-not-carried:all',
      'config-key:jwtSecret',
      'config-key:nope',
    ]) {
      expect(find(report, id), id).toBeDefined();
    }

    const severities = report.items.map((entry) => entry.severity);
    const firstInfo = severities.indexOf('info');

    expect(severities.slice(firstInfo).includes('action')).toBe(false);
  });
});

describe('GraphQL nullability', () => {
  it('announces in the check that the switch makes required output fields nullable on every type', () => {
    const required = [{ uid: 'api::article.article', fields: ['title', 'slug'] }];
    const report = buildReport(emptySnapshot(), context({ graphqlRequired: required }));
    const announced = find(report, 'graphql-nullable:required');

    expect(announced).toMatchObject({
      kind: 'graphql-nullable',
      severity: 'info',
      count: 2,
      refs: ['api::article.article'],
    });
    expect(announced?.message).toContain('on every content type and component');
    expect(announced?.message).toContain('because a field rule can hide a field');
    expect(announced?.message).toContain('2 required fields on 1 type');
  });

  it('announces it for a project with no required field too, and not when there is no GraphQL', () => {
    const none = find(
      buildReport(emptySnapshot(), context({ graphqlRequired: [] })),
      'graphql-nullable:required'
    );

    expect(none).toMatchObject({ count: 0, refs: [] });
    expect(none?.message).toContain('0 required fields;');
    expect(
      find(buildReport(emptySnapshot(), context()), 'graphql-nullable:required')
    ).toBeUndefined();
  });

  it('finds the required attributes a client can read', () => {
    expect(
      requiredOnGraphql({
        'api::article.article': {
          attributes: {
            title: { required: true },
            body: {},
            token: { required: true, private: true },
          },
        },
        'shared.seo': { attributes: { metaTitle: { required: false } } },
        'api::empty.empty': {},
      })
    ).toEqual([{ uid: 'api::article.article', fields: ['title'] }]);
  });
});

describe('estimate', () => {
  it('estimates the time from the measured rate for the database, and for none that has no rate', () => {
    const snapshot = emptySnapshot();

    snapshot.users.total = 100_000;

    for (const client of ['sqlite', 'postgres', 'mysql'] as const) {
      const rate = MEASURED_MS_PER_1000_USERS[client];
      const { estimate } = buildReport(snapshot, context({ client }));

      expect(estimate).toEqual(
        rate === null ? null : { client, minutes: Math.max(1, Math.ceil((100 * rate) / 60_000)) }
      );
    }
  });
});

describe('estimate rates', () => {
  it('has a measured rate for SQLite and Postgres and none for MySQL, which gives no estimate', () => {
    expect(MEASURED_MS_PER_1000_USERS).toEqual({ sqlite: 780, postgres: 1660, mysql: null });
    expect(estimateMinutes('postgres', 100_008)).toBe(3);
    expect(estimateMinutes('mysql', 100_000)).toBeNull();
  });
});

describe('nullableOnGraphql', () => {
  it('lists the attributes that are not required, and leaves out a type with none', () => {
    expect(
      nullableOnGraphql({
        a: { attributes: { x: { required: true }, y: {}, z: { required: false } } },
        b: { attributes: { x: { required: true } } },
      })
    ).toEqual([{ uid: 'a', fields: ['y', 'z'] }]);
  });
});

describe('duplicatesQuery', () => {
  it.each(['pg', 'mysql2'])(
    'names the group in SQL, joined on the lower-cased column, on %s',
    (client) => {
      const db = knex({ client });
      const { sql } = duplicatesQuery(db, 'up_users', 'email').toSQL();

      expect(sql).not.toContain('((select');
      expect(sql).toMatch(/inner join \(select min\(.id.\) as g, lower\(.email.\) as lc/i);
      expect(sql).toMatch(/on lower\(.t.\..email.\) = g\.lc/i);
    }
  );

  it('returns the lowest id of each group beside every member, trust columns on request', async () => {
    const db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    await db.schema.createTable('up_users', (t) => {
      t.increments('id');
      t.string('email');
      t.boolean('confirmed');
      t.boolean('blocked');
    });
    await db('up_users').insert([
      { email: 'A@x.io', confirmed: true, blocked: false },
      { email: 'b@x.io', confirmed: false, blocked: false },
      { email: 'a@X.io', confirmed: false, blocked: true },
      { email: 'c@x.io', confirmed: false, blocked: false },
      { email: 'B@x.io', confirmed: false, blocked: false },
      { email: '', confirmed: false, blocked: false },
      { email: '', confirmed: false, blocked: false },
    ]);

    const rows = await duplicatesQuery(db, 'up_users', 'email', true);

    expect(rows.map((row: any) => [row.id, row.g])).toEqual([
      [1, 1],
      [2, 2],
      [3, 1],
      [5, 2],
    ]);
    expect(rows[2]).toMatchObject({ confirmed: 0, blocked: 1 });

    await db.destroy();
  });
});

describe('readUpSnapshot', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('up_users', (t) => {
      t.increments('id');
      t.string('document_id');
      t.string('username');
      t.string('email');
      t.string('provider');
      t.string('reset_password_token');
      t.string('confirmation_token');
      t.boolean('confirmed');
      t.boolean('blocked');
      t.string('company').notNullable();
    });
    await db.schema.createTable('strapi_core_store_settings', (t) => {
      t.increments('id');
      t.string('key');
      t.text('value');
    });
    await db.schema.createTable('up_roles', (t) => {
      t.increments('id');
      t.string('name');
      t.string('type');
    });
    await db.schema.createTable('up_permissions', (t) => {
      t.increments('id');
      t.string('action');
    });
    await db.schema.createTable('up_users_role_lnk', (t) => {
      t.integer('user_id');
      t.integer('role_id');
    });
    await db.schema.createTable('up_permissions_role_lnk', (t) => {
      t.integer('permission_id');
      t.integer('role_id');
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('reads counts, duplicates, usernames and roles from the raw tables', async () => {
    await db('up_users').insert([
      {
        document_id: 'a',
        username: 'alice',
        email: 'a@x.io',
        provider: 'local',
        confirmed: true,
        blocked: false,
        company: 'c',
      },
      {
        document_id: null,
        username: 'Alice',
        email: 'A@X.io',
        provider: 'github',
        confirmed: false,
        blocked: true,
        company: 'c',
        reset_password_token: 't',
      },
      {
        document_id: 'c',
        username: 'jo',
        email: 'c@x.io',
        provider: 'local',
        confirmed: true,
        blocked: false,
        company: 'c',
        confirmation_token: 't',
      },
      {
        document_id: 'd',
        username: 'a@b',
        email: 'd@x.io',
        provider: 'local',
        confirmed: true,
        blocked: false,
        company: 'c',
      },
    ]);
    await db('up_roles').insert([
      { name: 'Auth', type: 'authenticated' },
      { name: 'auth', type: 'x' },
    ]);
    await db('up_permissions').insert([{ action: 'plugin::users-permissions.user.me' }]);
    await db('up_permissions_role_lnk').insert([{ permission_id: 1, role_id: 1 }]);
    await db('up_users_role_lnk').insert([
      { user_id: 1, role_id: 1 },
      { user_id: 3, role_id: 1 },
    ]);

    await db('strapi_core_store_settings').insert({
      key: 'plugin_users-permissions_grant',
      value: JSON.stringify({ github: { enabled: true } }),
    });

    const snapshot = await readUpSnapshot(db, 'sqlite');

    expect(snapshot.tables).toContain('up_users');
    expect(snapshot.users).toMatchObject({
      total: 4,
      local: 3,
      byProvider: { local: 3, github: 1 },
      unconfirmed: 1,
      blocked: 1,
      nullDocumentIds: 1,
      pendingResets: 1,
      pendingConfirmations: 1,
    });
    expect(snapshot.duplicateEmails).toEqual([{ keep: 1, rewrite: [2] }]);
    expect(snapshot.duplicateUsernames).toEqual([{ keep: 1, rewrite: [2] }]);
    expect(snapshot.duplicateRoleNames).toEqual([{ keep: 1, rewrite: [2] }]);
    expect(snapshot.usernames).toEqual({ nativeRefused: [3, 4], withAt: [4] });
    expect(snapshot.roles[0]).toMatchObject({
      id: 1,
      actions: ['plugin::users-permissions.user.me'],
      users: 2,
    });
    expect(snapshot.notNullColumns).toEqual(['company']);

    await db('up_users').insert([
      { username: 'bob', email: 'b@x.io', provider: 'local', company: 'c' },
      { username: 'BOB', email: 'B@x.io', provider: 'local', company: 'c' },
      { username: 'bob2', email: 'bob2@x.io', provider: 'local', company: 'c' },
    ]);
    const more = await readUpSnapshot(db, 'sqlite');

    expect(more.duplicateEmails).toEqual([
      { keep: 1, rewrite: [2] },
      { keep: 5, rewrite: [6] },
    ]);
    expect(more.duplicateUsernames).toEqual([
      { keep: 1, rewrite: [2] },
      { keep: 5, rewrite: [6] },
    ]);
    expect(snapshot.euUsersRows).toBeNull();
    expect(snapshot.store).toEqual({
      grant: { github: { enabled: true } },
      email: null,
      advanced: null,
    });
  });
});
