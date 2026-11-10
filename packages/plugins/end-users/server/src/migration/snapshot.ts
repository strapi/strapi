/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
// knex is Strapi's own database layer (hoisted); only its types are used here
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import type { Knex } from 'knex';

import { groupDuplicates } from './dedupe';
import { isNativeUsername } from './native-username';
import type { UpGrant } from './map-providers';
import type { UpEmailKey, UpEmailTemplate } from './map-templates';
import type { UpAdvanced } from './map-settings';

export type DbClient = 'sqlite' | 'postgres' | 'mysql';

/** `keep` is the row that holds the value (the most trusted, then the oldest); `rewrite` the others in that order */
export interface DuplicateGroup {
  keep: number;
  rewrite: number[];
}

export interface UpSnapshot {
  tables: string[];
  users: {
    total: number;
    local: number;
    byProvider: Record<string, number>;
    unconfirmed: number;
    blocked: number;
    nullDocumentIds: number;
    pendingResets: number;
    pendingConfirmations: number;
  };
  duplicateEmails: DuplicateGroup[];
  duplicateUsernames: DuplicateGroup[];
  duplicateRoleNames: DuplicateGroup[];
  usernames: { nativeRefused: number[]; withAt: number[] };
  roles: Array<{ id: number; name: string; type: string; actions: string[]; users: number }>;
  store: {
    grant: UpGrant | null;
    email: Partial<Record<UpEmailKey, UpEmailTemplate>> | null;
    advanced: UpAdvanced | null;
  };
  /** Custom API tokens that hold a users-permissions action, with those actions */
  apiTokens: Array<{ id: number; actions: string[] }>;
  /** Admin permissions on a users-permissions action */
  adminPermissions: Array<{ id: number; roleId: number; action: string; subject: string | null }>;
  /** `up_users` columns NOT NULL without a default, beyond Users & Permissions' own */
  notNullColumns: string[];
  /** `null`: there is no `eu_users` table */
  euUsersRows: number | null;
}

const UP = 'plugin::users-permissions.';
const PAGE = 1000;

/** The user columns Users & Permissions and Strapi create themselves */
const OWN_COLUMNS = new Set([
  'id',
  'document_id',
  'username',
  'email',
  'provider',
  'password',
  'reset_password_token',
  'confirmation_token',
  'confirmed',
  'blocked',
  'created_at',
  'updated_at',
  'published_at',
  'created_by_id',
  'updated_by_id',
  'locale',
]);

type Row = Record<string, unknown>;

const num = (value: unknown): number => Number(value ?? 0);

const present = (qb: Knex.QueryBuilder, column: string) =>
  qb.whereNotNull(column).andWhere(column, '<>', '');

const countOf = async (qb: Knex.QueryBuilder): Promise<number> => {
  const row = (await qb.count({ c: '*' }).first()) as Row | undefined;

  return num(row?.c);
};

const listTables = async (knex: Knex, client: DbClient): Promise<string[]> => {
  const like = "name LIKE 'up!_%' ESCAPE '!'";
  let rows: Row[];

  if (client === 'sqlite') {
    rows = await knex('sqlite_master').select('name').where('type', 'table').whereRaw(like);
  } else {
    const schema = client === 'postgres' ? 'current_schema()' : 'database()';
    rows = await knex('information_schema.tables')
      .select('table_name as name')
      .whereRaw(`table_schema = ${schema}`)
      .andWhere('table_type', 'BASE TABLE')
      .andWhereRaw(like.replace('name', 'table_name'));
  }

  return rows.map((row) => String(row.name)).sort((a, b) => a.localeCompare(b));
};

/** `up_users` columns NOT NULL without a default, other than the ones Strapi creates */
const listNotNullColumns = async (knex: Knex, client: DbClient): Promise<string[]> => {
  let names: string[];

  if (client === 'sqlite') {
    const result = (await knex.raw('PRAGMA table_info(up_users)')) as Row[];
    names = result
      .filter((col) => num(col.notnull) === 1 && col.dflt_value === null && num(col.pk) === 0)
      .map((col) => String(col.name));
  } else {
    const schema = client === 'postgres' ? 'current_schema()' : 'database()';
    const rows: Row[] = await knex('information_schema.columns')
      .select('column_name as name')
      .whereRaw(`table_schema = ${schema}`)
      .andWhere('table_name', 'up_users')
      .andWhere('is_nullable', 'NO')
      .whereNull('column_default');
    names = rows.map((col) => String(col.name));
  }

  return names.filter((name) => !OWN_COLUMNS.has(name));
};

/**
 * Rows whose `column` repeats once lower-cased, as the database compares them: only the rows of a
 * repeated value come back, oldest id first, and never the value itself. Each row carries `g`, the
 * lowest id of its group, which the database named: on MySQL a collation can make `josé` and `jose`
 * one group that no lower-casing in this process would see.
 */
export const duplicatesQuery = (
  knex: Knex,
  table: string,
  column: string,
  /** Also returns `confirmed` and `blocked`, which decide who keeps the value */
  withTrust = false
): Knex.QueryBuilder => {
  const groups = knex(table)
    .select(knex.raw('MIN(??) as g', ['id']), knex.raw('LOWER(??) as lc', [column]))
    .whereNotNull(column)
    .andWhere(column, '<>', '')
    .groupByRaw('LOWER(??)', [column])
    .havingRaw('COUNT(*) > 1');

  return knex(`${table} as t`)
    .joinRaw('inner join ? on LOWER(??) = g.lc', [
      groups.as('g') as unknown as Knex.Raw,
      `t.${column}`,
    ])
    .select(
      't.id as id',
      'g.g as g',
      ...(withTrust ? ['t.confirmed as confirmed', 't.blocked as blocked'] : [])
    )
    .orderBy('t.id');
};

const duplicatesOf = async (
  knex: Knex,
  table: string,
  column: string
): Promise<DuplicateGroup[]> => {
  const withTrust = table === 'up_users';
  const rows: Row[] = await duplicatesQuery(knex, table, column, withTrust);

  return groupDuplicates(
    rows.map((row) => ({
      id: num(row.id),
      g: num(row.g),
      ...(withTrust ? { confirmed: Boolean(row.confirmed), blocked: Boolean(row.blocked) } : {}),
    }))
  );
};

const readStore = async <T>(knex: Knex, name: string): Promise<T | null> => {
  const row = (await knex('strapi_core_store_settings')
    .where('key', `plugin_users-permissions_${name}`)
    .first('value')) as Row | undefined;

  if (!row || row.value === null || row.value === undefined) {
    return null;
  }

  try {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : null;
  } catch {
    return null;
  }
};

/** Usernames Better Auth would refuse, and ones with an `@`, in pages: only ids are kept */
const scanUsernames = async (knex: Knex): Promise<UpSnapshot['usernames']> => {
  const nativeRefused: number[] = [];
  const withAt: number[] = [];
  let last = 0;

  for (;;) {
    const page: Row[] = await knex('up_users')
      .select('id', 'username')
      .whereNotNull('username')
      .andWhere('username', '<>', '')
      .andWhere('id', '>', last)
      .orderBy('id')
      .limit(PAGE);

    for (const row of page) {
      const username = String(row.username);

      if (!isNativeUsername(username)) {
        nativeRefused.push(num(row.id));
      }

      if (username.includes('@')) {
        withAt.push(num(row.id));
      }
    }

    if (page.length < PAGE) {
      return { nativeRefused, withAt };
    }

    last = num(page[page.length - 1].id);
  }
};

const readUsers = async (knex: Knex): Promise<UpSnapshot['users']> => {
  const byProvider: Record<string, number> = {};
  const providers: Row[] = await knex('up_users')
    .select('provider')
    .count({ c: '*' })
    .groupBy('provider');

  for (const row of providers) {
    const provider = typeof row.provider === 'string' && row.provider ? row.provider : 'local';
    byProvider[provider] = (byProvider[provider] ?? 0) + num(row.c);
  }

  const [total, unconfirmed, blocked, nullDocumentIds, pendingResets, pendingConfirmations] =
    await Promise.all([
      countOf(knex('up_users')),
      countOf(
        knex('up_users').where((qb) => qb.where('confirmed', false).orWhereNull('confirmed'))
      ),
      countOf(knex('up_users').where('blocked', true)),
      countOf(knex('up_users').whereNull('document_id')),
      countOf(knex('up_users').where((qb) => present(qb, 'reset_password_token'))),
      countOf(knex('up_users').where((qb) => present(qb, 'confirmation_token'))),
    ]);

  return {
    total,
    local: byProvider.local ?? 0,
    byProvider,
    unconfirmed,
    blocked,
    nullDocumentIds,
    pendingResets,
    pendingConfirmations,
  };
};

const readRoles = async (knex: Knex): Promise<UpSnapshot['roles']> => {
  const roles: Row[] = await knex('up_roles').select('id', 'name', 'type').orderBy('id');
  const actions: Row[] = await knex('up_permissions_role_lnk as l')
    .join('up_permissions as p', 'p.id', 'l.permission_id')
    .select('l.role_id as roleId', 'p.action as action');
  const users: Row[] = await knex('up_users_role_lnk')
    .select('role_id as roleId')
    .count({ c: '*' })
    .groupBy('role_id');

  const actionsByRole = new Map<number, string[]>();

  for (const row of actions) {
    const id = num(row.roleId);
    actionsByRole.set(id, [...(actionsByRole.get(id) ?? []), String(row.action)]);
  }

  const usersByRole = new Map(users.map((row) => [num(row.roleId), num(row.c)]));

  return roles.map((role) => ({
    id: num(role.id),
    name: String(role.name ?? ''),
    type: String(role.type ?? ''),
    actions: actionsByRole.get(num(role.id)) ?? [],
    users: usersByRole.get(num(role.id)) ?? 0,
  }));
};

const readApiTokens = async (knex: Knex): Promise<UpSnapshot['apiTokens']> => {
  const tables = [
    'strapi_api_tokens',
    'strapi_api_token_permissions',
    'strapi_api_token_permissions_token_lnk',
  ];

  for (const table of tables) {
    if (!(await knex.schema.hasTable(table))) {
      return [];
    }
  }

  const rows: Row[] = await knex('strapi_api_token_permissions as p')
    .join('strapi_api_token_permissions_token_lnk as l', 'l.api_token_permission_id', 'p.id')
    .select('l.api_token_id as tokenId', 'p.action as action')
    .where('p.action', 'like', `${UP}%`)
    .orderBy('l.api_token_id');

  const byToken = new Map<number, string[]>();

  for (const row of rows) {
    const id = num(row.tokenId);
    byToken.set(id, [...(byToken.get(id) ?? []), String(row.action)]);
  }

  return [...byToken.entries()].map(([id, actions]) => ({ id, actions }));
};

const readAdminPermissions = async (knex: Knex): Promise<UpSnapshot['adminPermissions']> => {
  if (
    !(await knex.schema.hasTable('admin_permissions')) ||
    !(await knex.schema.hasTable('admin_permissions_role_lnk'))
  ) {
    return [];
  }

  const rows: Row[] = await knex('admin_permissions as p')
    .join('admin_permissions_role_lnk as l', 'l.permission_id', 'p.id')
    .select('p.id as id', 'l.role_id as roleId', 'p.action as action', 'p.subject as subject')
    .where('p.action', 'like', `${UP}%`)
    .orderBy('p.id');

  return rows.map((row) => ({
    id: num(row.id),
    roleId: num(row.roleId),
    action: String(row.action),
    subject: typeof row.subject === 'string' ? row.subject : null,
  }));
};

const EMPTY_USERS: UpSnapshot['users'] = {
  total: 0,
  local: 0,
  byProvider: {},
  unconfirmed: 0,
  blocked: 0,
  nullDocumentIds: 0,
  pendingResets: 0,
  pendingConfirmations: 0,
};

/**
 * Reads a Users & Permissions database as it is now, from the raw tables. Read only. Duplicates are
 * grouped in SQL and usernames scanned in pages, so no table is ever held whole. A project without
 * the `up_*` tables gives an empty snapshot.
 */
export const readUpSnapshot = async (knex: Knex, client: DbClient): Promise<UpSnapshot> => {
  const tables = await listTables(knex, client);
  const has = (name: string) => tables.includes(name);
  const hasUsers = has('up_users');
  const hasRoles =
    has('up_roles') &&
    has('up_permissions') &&
    has('up_permissions_role_lnk') &&
    has('up_users_role_lnk');

  const store = {
    grant: await readStore<UpGrant>(knex, 'grant'),
    email: await readStore<Partial<Record<UpEmailKey, UpEmailTemplate>>>(knex, 'email'),
    advanced: await readStore<UpAdvanced>(knex, 'advanced'),
  };

  return {
    tables,
    users: hasUsers ? await readUsers(knex) : EMPTY_USERS,
    duplicateEmails: hasUsers ? await duplicatesOf(knex, 'up_users', 'email') : [],
    duplicateUsernames: hasUsers ? await duplicatesOf(knex, 'up_users', 'username') : [],
    duplicateRoleNames: has('up_roles') ? await duplicatesOf(knex, 'up_roles', 'name') : [],
    usernames: hasUsers ? await scanUsernames(knex) : { nativeRefused: [], withAt: [] },
    roles: hasRoles ? await readRoles(knex) : [],
    store,
    apiTokens: await readApiTokens(knex),
    adminPermissions: await readAdminPermissions(knex),
    notNullColumns: hasUsers ? await listNotNullColumns(knex, client) : [],
    euUsersRows: (await knex.schema.hasTable('eu_users')) ? await countOf(knex('eu_users')) : null,
  };
};
