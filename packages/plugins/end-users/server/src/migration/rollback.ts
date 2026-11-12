/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
import type { Knex } from 'knex';
import { isDeepStrictEqual } from 'node:util';
import type { Core } from '@strapi/types';
import type { Database } from '@strapi/database';

import { ACCOUNT_UID, PLUGIN_ID, PROFILE_UID, USER_UID, VERIFICATION_UID } from '../constants';
import { PENDING_LINK_PREFIX } from '../utils/pending-link';
import type { MigrationContext, MigrationStepFn } from './control';
import { readRecord, updateRecord } from './record';
import type { MigrationRecord } from './record';
import { columnsOf, dropTable, hasTable, qualified, renameBack, tableOf } from './schema-ops';
import type { DbClient } from './snapshot';
import { RENAMED, upJoinTableName, upLinkColumn } from './tables';
import { contentTypesOf } from '../utils/typed-strapi';

const UP = 'plugin::users-permissions';
const EU = `plugin::${PLUGIN_ID}`;
const UP_USER = `${UP}.user`;
const UP_USERS = 'up_users';
const ADMIN_PERMISSION = 'admin::permission';
const HISTORY_TABLE = 'strapi_history_versions';
const PUBLIC_ROLES: ReadonlySet<string> = new Set(['public', 'authenticated']);
const PAGE = 1000;

type Row = Record<string, unknown>;
type Model = { tableName: string; singularName?: string; attributes: Record<string, any> };

/* -------------------------------------------------------------------------------------------------
 * Pure helpers
 * -----------------------------------------------------------------------------------------------*/

/** The way back of `mapAdminAction`: the end-users actions that replaced a users-permissions one */
const REVERSED: Readonly<Record<string, string>> = {
  [`${EU}.roles.read`]: `${UP}.roles.read`,
  [`${EU}.roles.create`]: `${UP}.roles.create`,
  [`${EU}.roles.update`]: `${UP}.roles.update`,
  [`${EU}.roles.delete`]: `${UP}.roles.delete`,
  [`${EU}.providers.read`]: `${UP}.providers.read`,
  [`${EU}.providers.update`]: `${UP}.providers.update`,
  [`${EU}.settings.read`]: `${UP}.advanced-settings.read`,
  [`${EU}.settings.update`]: `${UP}.advanced-settings.update`,
};

/**
 * The users-permissions admin action an end-users one stands for, or `null` when it has none. The
 * email plugin's `templates.read` is the email plugin's own and stays as it is.
 */
export const reverseAdminAction = (action: string): string | null => REVERSED[action] ?? null;

/**
 * The type a role gets in users-permissions, from its name: lower-case words joined by
 * underscores, with `_2`, `_3`, ... when `taken` already holds it.
 */
export const upRoleType = (name: string, taken: ReadonlySet<string>): string => {
  const base =
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'role';
  let type = base;
  let n = 2;

  while (taken.has(type)) {
    type = `${base}_${n}`;
    n += 1;
  }

  return type;
};

/**
 * The columns of `table` (as `present` lists them) that the model of the table does not declare:
 * what a project's own attribute left behind, or what the compatibility mode kept.
 */
export const leftoverColumns = (db: Database, table: string, present: string[]): string[] => {
  const model = [...db.metadata.values()].find((entry) => entry.tableName === table) as
    Model | undefined;

  if (!model) {
    return [];
  }

  const declared = new Set<string>(['id']);

  for (const attribute of Object.values(model.attributes)) {
    for (const name of [
      attribute.columnName,
      attribute.joinColumn?.name,
      attribute.morphColumn?.idColumn?.name,
      attribute.morphColumn?.typeColumn?.name,
    ]) {
      if (typeof name === 'string') {
        declared.add(name);
      }
    }
  }

  return present.filter((column) => !declared.has(column));
};

/* -------------------------------------------------------------------------------------------------
 * What the move recorded
 * -----------------------------------------------------------------------------------------------*/

const modelOf = (db: Database, uid: string): Model => db.metadata.get(uid) as unknown as Model;

const columnOf = (db: Database, uid: string, attribute: string): string | undefined =>
  modelOf(db, uid).attributes[attribute]?.columnName;

/** The original names of the staged tables that the post-sync copied into the profile's own */
const copiedOriginals = (record: MigrationRecord): Set<string> =>
  new Set(
    record.carried.copied
      .map((staged) => record.staged[staged])
      .filter((original): original is string => typeof original === 'string')
  );

interface Column {
  /** In the profile's table */
  from: string;
  /** In the users-permissions table */
  to: string;
  type: 'integer' | 'float' | 'double' | 'string';
  /** The table a foreign key of the column points at, which SQLite's schema diff would not add */
  references?: string;
}

interface Copy {
  from: string;
  to: string;
  /** The column of the profile's table that holds the profile's id */
  key: string;
  columns: Column[];
}

/** The link tables Users & Permissions' user owned and the profile took over, with the ones it re-creates */
const linkCopies = (db: Database, copied: Set<string>): Copy[] => {
  const profile = modelOf(db, PROFILE_UID);
  const copies: Copy[] = [];

  for (const [name, attribute] of Object.entries(profile.attributes)) {
    const joinTable = attribute.type === 'relation' ? attribute.joinTable : undefined;
    const to = upJoinTableName(db, name);

    if (
      name !== 'user' &&
      joinTable &&
      joinTable.joinColumn?.referencedTable === profile.tableName &&
      copied.has(to)
    ) {
      const targetName = modelOf(db, attribute.target)?.singularName;
      const toUser =
        joinTable.inverseJoinColumn.referencedTable === modelOf(db, USER_UID).tableName;
      const columns: Column[] = [
        {
          from: joinTable.joinColumn.name,
          to: upLinkColumn(joinTable, joinTable.joinColumn.name, attribute.relation, targetName),
          type: 'integer',
          references: UP_USERS,
        },
        {
          from: joinTable.inverseJoinColumn.name,
          to: upLinkColumn(
            joinTable,
            joinTable.inverseJoinColumn.name,
            attribute.relation,
            targetName
          ),
          type: 'integer',
          references: toUser ? UP_USERS : joinTable.inverseJoinColumn.referencedTable,
        },
      ];

      if (joinTable.orderColumnName) {
        columns.push({
          from: joinTable.orderColumnName,
          to: upLinkColumn(joinTable, joinTable.orderColumnName, attribute.relation, targetName),
          type: 'float',
        });
      }

      if (joinTable.inverseOrderColumnName) {
        columns.push({
          from: joinTable.inverseOrderColumnName,
          to: upLinkColumn(
            joinTable,
            joinTable.inverseOrderColumnName,
            attribute.relation,
            targetName
          ),
          type: 'float',
        });
      }

      copies.push({ from: joinTable.name, to, key: joinTable.joinColumn.name, columns });
    }
  }

  return copies;
};

/** The component table of the profile, which the post-sync filled from the user's and the rollback fills again */
const componentCopy = (db: Database, copied: Set<string>): Copy | null => {
  const profile = modelOf(db, PROFILE_UID);
  const model = [...db.metadata.values()].find(
    (entry) => entry.tableName === `${profile.tableName}_cmps`
  ) as Model | undefined;

  if (!model || !copied.has('up_users_cmps')) {
    return null;
  }

  return {
    from: model.tableName,
    to: 'up_users_cmps',
    key: 'entity_id',
    columns: [
      { from: 'entity_id', to: 'entity_id', type: 'integer', references: UP_USERS },
      { from: 'cmp_id', to: 'cmp_id', type: 'integer' },
      { from: 'component_type', to: 'component_type', type: 'string' },
      { from: 'field', to: 'field', type: 'string' },
      { from: 'order', to: 'order', type: 'double' },
    ],
  };
};

const NON_SCALAR = new Set(['relation', 'component', 'dynamiczone', 'media']);

/** What the profile gets of its own, never from the user's row */
const OWN_COLUMNS = new Set([
  'id',
  'document_id',
  'created_at',
  'updated_at',
  'published_at',
  'created_by_id',
  'updated_by_id',
  'locale',
]);

/** The profile's scalar attributes, as the column each is stored in */
const profileScalars = (strapi: Core.Strapi): string[] => {
  const attributes =
    contentTypesOf<Record<string, { attributes?: Record<string, any> }>>(strapi)[PROFILE_UID]
      ?.attributes ?? {};

  return Object.entries(attributes)
    .filter(([name, attribute]) => !NON_SCALAR.has(attribute.type) && name !== 'user')
    .map(([name]) => columnOf(strapi.db, PROFILE_UID, name))
    .filter((column): column is string => column !== undefined && !OWN_COLUMNS.has(column));
};

/* -------------------------------------------------------------------------------------------------
 * The run
 * -----------------------------------------------------------------------------------------------*/

/** What a rollback cannot bring back, as counts */
interface Lost {
  profileAttributes: number;
  accounts: number;
  roleLinks: number;
  permissionRows: number;
  adminActions: number;
}

interface Run {
  strapi: Core.Strapi;
  db: Database;
  trx: Knex;
  client: DbClient;
  record: MigrationRecord;
  copied: Set<string>;
  lost: Lost;
}

const countOf = async (query: Knex.QueryBuilder): Promise<number> =>
  Number(((await query.count({ c: '*' }).first()) as Row | undefined)?.c ?? 0);

/** The user's own columns, brought back from what end-users keeps: verification, ban, provider, username, moved values */
const restoreUsers = async ({ strapi, db, trx, lost, record }: Run, userTable: string) => {
  const account = modelOf(db, ACCOUNT_UID);
  const verified = columnOf(db, USER_UID, 'emailVerified') ?? 'email_verified';
  const banned = columnOf(db, USER_UID, 'banned') ?? 'banned';
  const providerId = account.attributes.providerId?.columnName ?? 'provider_id';
  const accountUser = account.attributes.userId?.columnName ?? 'user_id';
  const accountIdColumn = account.attributes.accountId?.columnName ?? 'account_id';
  const users = () => tableOf(trx, db, userTable);
  const columns = await columnsOf(trx, db, userTable);
  // A migration that stopped early has none of end-users' own tables yet
  const hasAccounts = await hasTable(trx, db, account.tableName);
  const copy = async (target: string, source: string) => {
    if (columns.includes(target) && columns.includes(source)) {
      await users().update({ [target]: trx.raw('COALESCE(??, ?)', [source, false]) });
    }
  };

  // Only the users step fills `email_verified` and `banned`, from the columns being copied back here
  if (record.completedSteps.includes('users')) {
    await copy('confirmed', verified);
    await copy('blocked', banned);

    // U&P's `blocked` has no expiry: a ban that has already run out must not come back as a block
    const banExpires = columnOf(db, USER_UID, 'banExpires') ?? 'ban_expires';

    if (columns.includes('blocked') && columns.includes(banExpires)) {
      const now = Date.now();
      const timed = (await users()
        .where(banned, true)
        .whereNotNull(banExpires)
        .select('id', { expires: banExpires })) as Array<{ id: number; expires: unknown }>;
      // A value that is not a date stays blocked: a ban is only lifted when its end is known
      const lapsed = timed
        .filter(({ expires }) => {
          const end = new Date(expires as string | number | Date).getTime();

          return !Number.isNaN(end) && end <= now;
        })
        .map(({ id }) => id);

      for (let i = 0; i < lapsed.length; i += 500) {
        await users()
          .whereIn('id', lapsed.slice(i, i + 500))
          .update({ blocked: false });
      }
    }
  }

  if (hasAccounts && columns.includes('provider')) {
    const accounts = (alias: string) =>
      trx(`${qualified(db, account.tableName)} as ${alias}`).whereRaw('?? = ??', [
        `${alias}.${accountUser}`,
        `${userTable}.document_id`,
      ]);
    // A password account's id is the user's: matching on it too lets SQLite use the (provider,
    // account) index in full, where `provider_id` alone has it scan every password account once per
    // user (quadratic: past half an hour at 100,000 users)
    const credential = (alias: string) =>
      accounts(alias)
        .select(trx.raw('1'))
        .where(`${alias}.${providerId}`, 'credential')
        .whereRaw('?? = ??', [`${alias}.${accountIdColumn}`, `${userTable}.document_id`]);

    // Whoever has no password account signs in the way their first account says; the rest locally
    await users()
      .whereExists(accounts('a').select(trx.raw('1')))
      .whereNotExists(credential('c'))
      .update({ provider: accounts('f').select(`f.${providerId}`).orderBy('f.id').limit(1) });
    await users().whereExists(credential('d')).update({ provider: 'local' });
  }

  // Users Permissions' username is required: one without gets the start of the address and the id
  for (;;) {
    const page = (await users().whereNull('username').limit(PAGE).select('id', 'email')) as Row[];

    if (page.length === 0) {
      break;
    }

    for (const { id, email } of page) {
      await users()
        .where({ id })
        .update({ username: `${String(email ?? '').split('@')[0] || 'user'}_${id}` });
    }
  }

  // The spelling a user signed up with comes back from `display_username`; a user whose username was
  // rewritten (a duplicate) or whose spelling another user already holds keeps the migrated one
  if (columns.includes('display_username')) {
    const mysql = db.dialect.client === 'mysql';
    const candidates = () =>
      trx(`${qualified(db, userTable)} as u`)
        .whereNotNull('u.display_username')
        .whereRaw('LOWER(??) = ??', ['u.display_username', 'u.username'])
        .whereRaw(mysql ? 'CAST(?? AS BINARY) <> CAST(?? AS BINARY)' : '?? <> ??', [
          'u.display_username',
          'u.username',
        ]);
    const holders = () =>
      trx(`${qualified(db, userTable)} as o`)
        .select(trx.raw('1'))
        .whereRaw('?? = ??', ['o.username', 'u.display_username'])
        .whereRaw('?? <> ??', ['o.id', 'u.id']);

    for (;;) {
      const ids = (
        (await candidates().whereNotExists(holders()).limit(PAGE).select('u.id')) as Row[]
      ).map((row) => row.id as number);

      if (ids.length === 0) {
        break;
      }

      await users()
        .whereIn('id', ids)
        .update({ username: trx.raw('??', ['display_username']) });
    }

    const kept = (
      (await candidates().whereExists(holders()).limit(50).select('u.id')) as Row[]
    ).map((row) => row.id);

    if (kept.length > 0) {
      strapi.log.info(
        `${PLUGIN_ID}: ${kept.length === 50 ? 'at least 50' : kept.length} users keep their migrated username because another user holds their original spelling (ids ${kept.join(', ')})`
      );
    }
  }

  // Each scalar column the move took to the profile takes the profile's current value
  const profile = modelOf(db, PROFILE_UID);
  const link = profile.attributes.user.joinTable as {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };
  const hasProfiles =
    (await hasTable(trx, db, link.name)) && (await hasTable(trx, db, profile.tableName));
  const wanted = hasProfiles ? profileScalars(strapi) : [];
  const leftover = new Set(leftoverColumns(db, modelOf(db, USER_UID).tableName, columns));
  const moved = wanted.filter((column) => leftover.has(column));
  const ofUser = (alias: string) =>
    trx(`${qualified(db, link.name)} as ${alias}`).whereRaw('?? = ??', [
      `${alias}.${link.inverseJoinColumn.name}`,
      `${userTable}.id`,
    ]);

  lost.profileAttributes += wanted.length - moved.length;

  if (moved.length > 0) {
    await users()
      .whereExists(ofUser('e').select(trx.raw('1')))
      .update(
        Object.fromEntries(
          moved.map((column) => [
            column,
            trx(`${qualified(db, profile.tableName)} as p`)
              .select(`p.${column}`)
              .whereIn('p.id', ofUser('l').select(`l.${link.joinColumn.name}`))
              .limit(1),
          ])
        )
      );
  }

  // Accounts beyond a user's first have no place in the one `provider` column
  if (hasAccounts) {
    const all = await countOf(trx(qualified(db, account.tableName)));
    const owners = Number(
      (
        (await trx(qualified(db, account.tableName)).countDistinct({ c: accountUser }).first()) as
          Row | undefined
      )?.c ?? 0
    );

    lost.accounts = Math.max(0, all - owners);
  }
};

/**
 * Drops the pending links the migration recorded (`utils/pending-link`), and answers how many. A
 * rollback drops them because Users & Permissions has no use for them, and a later migration
 * records them again from its own state; the cleanup after the compatibility mode drops them
 * because they last only as long as the mode. A user a pending link was spent for keeps the account
 * it made, which a rollback reads as their provider.
 */
export const dropPendingLinks = async (trx: Knex, db: Database): Promise<number> => {
  const verification = modelOf(db, VERIFICATION_UID);
  const identifier = columnOf(db, VERIFICATION_UID, 'identifier') ?? 'identifier';

  // A migration that stopped early has none of end-users' own tables yet
  if (!(await hasTable(trx, db, verification.tableName))) {
    return 0;
  }

  return tableOf(trx, db, verification.tableName)
    .where(identifier, 'like', `${PENDING_LINK_PREFIX}%`)
    .del();
};

/** The users' roles: one each, the first by order and then by id, and the role types users-permissions keeps */
const restoreRoles = async (
  { db, trx, lost, record }: Run,
  roleTable: string,
  linkName: string
) => {
  const user = modelOf(db, USER_UID);
  const joinTable = user.attributes.roles?.joinTable as
    | {
        name: string;
        joinColumn: { name: string };
        inverseJoinColumn: { name: string };
        orderColumnName?: string;
      }
    | undefined;
  const userKey = joinTable?.joinColumn.name ?? 'user_id';
  const order = joinTable?.orderColumnName ?? 'role_ord';
  const link = () => tableOf(trx, db, linkName);
  const hasOrder = (await columnsOf(trx, db, linkName)).includes(order);

  for (;;) {
    const users = (await link()
      .select(userKey)
      .groupBy(userKey)
      .havingRaw('count(*) > 1')
      .limit(PAGE)) as Row[];

    if (users.length === 0) {
      break;
    }

    const rows = (await link()
      .whereIn(
        userKey,
        users.map((row) => row[userKey] as number)
      )
      .select('id', userKey, ...(hasOrder ? [order] : []))) as Row[];
    const first = new Map<unknown, Row>();
    const rank = (row: Row) => [Number(row[order] ?? 0), Number(row.id)];

    for (const row of rows) {
      const best = first.get(row[userKey]);
      const [a, b] = rank(row);
      const [x, y] = best ? rank(best) : [Infinity, Infinity];

      if (!best || a < x || (a === x && b < y)) {
        first.set(row[userKey], row);
      }
    }

    const extra = rows
      .filter((row) => first.get(row[userKey]) !== row)
      .map((row) => row.id as number);

    await link().whereIn('id', extra).del();
    lost.roleLinks += extra.length;
  }

  const roles = (await tableOf(trx, db, roleTable)
    .orderBy('id')
    .select('id', 'name', 'type')) as Array<{ id: number; name: string; type: string | null }>;
  const isCustom = (type: string | null) => !type || !PUBLIC_ROLES.has(type);
  const taken = new Set(roles.filter((role) => !isCustom(role.type)).map((role) => role.type!));

  // A role the roles step never reached keeps the type it has
  for (const role of record.completedSteps.includes('roles')
    ? roles.filter((entry) => isCustom(entry.type))
    : []) {
    const type = upRoleType(role.name ?? '', taken);

    taken.add(type);
    await tableOf(trx, db, roleTable).where({ id: role.id }).update({ type });
  }
};

/** Creates a users-permissions table in core's shape; SQLite's schema diff adds no keys, so it gets them here */
const createUpTable = async (run: Run, copy: Copy) => {
  const { db, trx, client } = run;

  await dropTable(trx, db, client, copy.to);
  await db.getSchemaConnection(trx).createTable(copy.to, (table) => {
    table.increments('id');

    for (const column of copy.columns) {
      if (column.type === 'string') {
        table.string(column.to);
      } else if (column.type === 'integer') {
        const built = table.integer(column.to).unsigned();

        if (client === 'sqlite' && column.references) {
          built.references('id').inTable(column.references).onDelete('CASCADE');
        }
      } else {
        table[column.type](column.to).unsigned();
      }
    }
  });
};

/** Fills a users-permissions table from the profile's own, the profile's user telling whose each row is */
const fillUpTable = async (run: Run, copy: Copy) => {
  const { db, trx } = run;
  const profile = modelOf(db, PROFILE_UID);
  const link = profile.attributes.user.joinTable as {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };

  if (!(await hasTable(trx, db, link.name))) {
    return;
  }

  const select = trx(`${qualified(db, copy.from)} as a`)
    .join(`${qualified(db, link.name)} as ul`, `ul.${link.joinColumn.name}`, `a.${copy.key}`)
    .select(
      copy.columns.map((column) =>
        column.from === copy.key
          ? trx.raw('??', [`ul.${link.inverseJoinColumn.name}`])
          : trx.raw('??', [`a.${column.from}`])
      )
    );

  await trx
    .into(
      trx.raw(`?? (${copy.columns.map(() => '??').join(', ')})`, [
        qualified(db, copy.to),
        ...copy.columns.map((column) => column.to),
      ])
    )
    .insert(select);
};

/** Media the profile holds belongs to the user again, under the user's id */
const restoreMedia = async ({ db, trx }: Run) => {
  const profile = modelOf(db, PROFILE_UID);
  const link = profile.attributes.user.joinTable as {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };

  if (!(await hasTable(trx, db, link.name))) {
    return;
  }

  const tables = new Set<string>();

  for (const model of db.metadata.values() as Iterable<Model>) {
    for (const attribute of Object.values(model.attributes)) {
      if (
        attribute.type === 'relation' &&
        attribute.relation === 'morphToMany' &&
        attribute.joinTable?.morphColumn?.typeColumn?.name === 'related_type'
      ) {
        tables.add(String(attribute.joinTable.name));
      }
    }
  }

  const ofProfile = (alias: string, table: string) =>
    trx(`${qualified(db, link.name)} as ${alias}`).whereRaw('?? = ??', [
      `${alias}.${link.joinColumn.name}`,
      `${table}.related_id`,
    ]);

  for (const table of tables) {
    if (await hasTable(trx, db, table)) {
      await tableOf(trx, db, table)
        .where({ related_type: PROFILE_UID })
        .whereExists(ofProfile('e', table).select(trx.raw('1')))
        .update({
          related_type: UP_USER,
          related_id: ofProfile('l', table).select(`l.${link.inverseJoinColumn.name}`).limit(1),
        });
    }
  }
};

/** The staged tables the move did not copy go back to the names they had; rows of roles that are gone go */
const restoreStaged = async ({ db, trx, client, record }: Run) => {
  for (const [staged, original] of Object.entries(record.staged)) {
    if (await hasTable(trx, db, staged)) {
      if (record.carried.copied.includes(staged)) {
        // Copied into the profile's table, which the rollback has just read back: nothing to keep
        await dropTable(trx, db, client, staged);
      } else {
        await renameBack(trx, db, client, staged, original);
      }
    }
  }

  const permissions = 'up_permissions';
  const link = 'up_permissions_role_lnk';

  if ((await hasTable(trx, db, link)) && (await hasTable(trx, db, permissions))) {
    await tableOf(trx, db, link)
      .whereNotIn('role_id', tableOf(trx, db, 'up_roles').select('id'))
      .del();
    await tableOf(trx, db, permissions)
      .whereNotIn('id', tableOf(trx, db, link).select('permission_id'))
      .del();
  }
};

/* -------------------------------------------------------------------------------------------------
 * The admin side
 * -----------------------------------------------------------------------------------------------*/

interface PermissionRow {
  id: number;
  action: string;
  subject: string | null;
  properties: { fields?: unknown } & Record<string, unknown>;
  conditions?: unknown;
  role?: { id: number } | null;
}

const fieldsOf = (row: PermissionRow): string[] | null =>
  Array.isArray(row.properties?.fields)
    ? (row.properties.fields as unknown[]).filter((f): f is string => typeof f === 'string')
    : null;

const withoutFields = (properties: PermissionRow['properties'] | undefined) =>
  Object.fromEntries(Object.entries(properties ?? {}).filter(([key]) => key !== 'fields'));

/** The user's `roles` is the `role` of users-permissions */
const RENAMED_FIELDS: Readonly<Record<string, string>> = { roles: 'role' };

const restoreAdmin = async ({ strapi, db, trx, lost }: Run) => {
  const query = strapi.db.query(ADMIN_PERMISSION);

  const ours = (await query.findMany({
    where: { action: { $startsWith: `${EU}.` } },
    populate: ['role'],
  })) as PermissionRow[];

  for (const row of ours.filter((entry) => entry.role)) {
    const target = reverseAdminAction(row.action);

    if (target === null) {
      lost.adminActions += 1;
      continue;
    }

    const existing = await query.findOne({
      where: { action: target, role: row.role!.id, subject: row.subject },
    });

    if (existing) {
      await query.delete({ where: { id: row.id } });
    } else {
      await query.update({ where: { id: row.id }, data: { action: target } });
    }
  }

  const users = (await query.findMany({
    where: { action: { $startsWith: 'plugin::content-manager.' }, subject: USER_UID },
    populate: ['role'],
  })) as PermissionRow[];

  for (const row of users.filter((entry) => entry.role)) {
    const fields = fieldsOf(row)?.map((field) => RENAMED_FIELDS[field] ?? field);

    await query.update({
      where: { id: row.id },
      data: {
        subject: UP_USER,
        properties: fields ? { ...row.properties, fields } : row.properties,
      },
    });
  }

  // The profile's rows are folded into the user's row of the same role and action
  const profiles = (await query.findMany({
    where: { action: { $startsWith: 'plugin::content-manager.' }, subject: PROFILE_UID },
    populate: ['role'],
  })) as PermissionRow[];

  for (const row of profiles.filter((entry) => entry.role)) {
    const into = (await query.findOne({
      where: { action: row.action, subject: UP_USER, role: row.role!.id },
    })) as PermissionRow | null;

    if (!into) {
      await query.update({ where: { id: row.id }, data: { subject: UP_USER } });
      continue;
    }

    const have = fieldsOf(into);
    const add = fieldsOf(row);
    const same =
      isDeepStrictEqual(into.conditions ?? [], row.conditions ?? []) &&
      isDeepStrictEqual(withoutFields(into.properties), withoutFields(row.properties));

    if (!same) {
      // Never wider than the user's row: the fields are not merged, and the log says what to grant
      strapi.log.info(
        `${PLUGIN_ID}: the profile permission of admin role ${row.role!.id} on ${row.action} has other conditions or properties than the user's, so its fields (${(add ?? []).join(', ') || 'all'}) were not merged; grant them in users-permissions if they are needed`
      );
    } else if (have && add) {
      const union = [...new Set([...have, ...add])];

      if (union.length > have.length) {
        await query.update({
          where: { id: into.id },
          data: { properties: { ...into.properties, fields: union } },
        });
      }
    }

    await query.delete({ where: { id: row.id } });
  }

  if (await hasTable(trx, db, HISTORY_TABLE)) {
    await tableOf(trx, db, HISTORY_TABLE)
      .where({ content_type: USER_UID })
      .update({ content_type: UP_USER });
  }
};

/* -------------------------------------------------------------------------------------------------
 * The step
 * -----------------------------------------------------------------------------------------------*/

/** Index names of the end-users tables that users-permissions has no use for */
const unwantedName = (name: string) => name.endsWith('_email_uq');

/**
 * Takes the project back to Users & Permissions from its state now: users, roles, the values the
 * profile holds, media, the role permissions staged at the cutover and the admin's actions. Runs
 * in the start's one transaction before the schema sync; the start is stopped after it. Every
 * table has the name Users & Permissions gives it when it commits, so that plugin's own sync
 * finds them, adds what it needs and leaves the rows alone.
 */
export const runRollback: MigrationStepFn = async (trx, db, ctx: MigrationContext) => {
  const { strapi } = ctx;
  const record = await readRecord(strapi);

  // A migration that stopped part-way (`in-progress`) rolls back from whatever it reached
  if (!record || record.status === 'rolled-back' || record.claim?.by !== ctx.owner) {
    throw new Error('This start does not hold a migration to roll back. Nothing was changed.');
  }

  const run: Run = {
    strapi,
    db,
    trx,
    client: db.dialect.client as DbClient,
    record,
    copied: copiedOriginals(record),
    lost: { profileAttributes: 0, accounts: 0, roleLinks: 0, permissionRows: 0, adminActions: 0 },
  };
  // MySQL commits each rename on its own: a run that stopped after them finds the tables renamed
  const nameNow = async (up: string, eu: string) => ((await hasTable(trx, db, eu)) ? eu : up);
  const userModel = modelOf(db, USER_UID);
  const userTable = await nameNow(UP_USERS, userModel.tableName);
  const roleTable = await nameNow('up_roles', RENAMED.up_roles);
  const linkTable = await nameNow(
    'up_users_role_lnk',
    (userModel.attributes.roles?.joinTable?.name as string | undefined) ?? RENAMED.up_users_role_lnk
  );

  if (!(await hasTable(trx, db, userTable))) {
    throw new Error('There is no user table to roll back. Nothing was changed.');
  }

  const users = await countOf(tableOf(trx, db, userTable));
  const roles = await countOf(tableOf(trx, db, roleTable));

  await restoreUsers(run, userTable);
  await dropPendingLinks(trx, db);
  await restoreRoles(run, roleTable, linkTable);

  run.lost.permissionRows = (await hasTable(trx, db, 'eu_permissions'))
    ? await countOf(tableOf(trx, db, 'eu_permissions'))
    : 0;

  // Marked before the first rename, which MySQL commits on its own with everything written before it:
  // a start that finds the mark finishes the rollback, or refuses
  await updateRecord(strapi, { rollbackStartedAt: ctx.now().toISOString() });

  // The three tables the move renamed take their names back, so the keys that point at them follow
  for (const [up, eu] of Object.entries(RENAMED)) {
    await renameBack(trx, db, run.client, eu, up, up === UP_USERS ? unwantedName : undefined);
  }

  // What the profile holds that Users & Permissions' user had its own tables for
  for (const copy of [...linkCopies(db, run.copied), componentCopy(db, run.copied)]) {
    if (copy && (await hasTable(trx, db, copy.from))) {
      await createUpTable(run, copy);
      await fillUpTable(run, copy);
    }
  }

  await restoreMedia(run);
  await restoreStaged(run);
  await restoreAdmin(run);

  await updateRecord(strapi, {
    status: 'rolled-back',
    rolledBackAt: ctx.now().toISOString(),
    rollbackStartedAt: null,
    claim: null,
  });
  (
    strapi.plugin(PLUGIN_ID)?.service('compat') as { clearCutoverCache?: () => void } | undefined
  )?.clearCutoverCache?.();

  const { lost } = run;

  strapi.log.info(
    `${PLUGIN_ID}: rolled back to users-permissions: ${users} users and ${roles} roles; not brought back: ` +
      `${lost.profileAttributes} profile attributes added after the move, ` +
      `${lost.accounts} accounts beyond a user's first, ` +
      `${lost.roleLinks} roles beyond a user's first, ` +
      `${lost.permissionRows} end-users permission rows, ` +
      `${lost.adminActions} admin actions with no users-permissions counterpart`
  );
};
