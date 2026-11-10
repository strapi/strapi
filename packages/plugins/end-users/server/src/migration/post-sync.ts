/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
// knex is Strapi's own database layer (hoisted); only its types are used here
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import type { Core } from '@strapi/types';

import { readCompatConfig } from '../compat/config';
import { ACCOUNT_UID, PLUGIN_ID, PROFILE_UID, ROLE_UID, USER_UID } from '../constants';
import type permissionService from '../services/permission';
import { readableFields, writableFields } from '../utils/writable-fields';
import type { PermissionMapContext } from './map-permissions';
import { mapRolePermissions } from './map-permissions';
import {
  addReportItems,
  claimMigration,
  lastClaimOwner,
  readRecord,
  readReport,
  releaseMigration,
  updateRecord,
  writeReport,
} from './record';
import type { MigrationRecord, MigrationStep } from './record';
import { permissionItems } from './report';
import { adminStep } from './admin-side';
import { keepHold, storesStep } from './post-sync-stores';
import { waitForClaim } from './pre-sync';
import { upJoinTableName, upLinkColumn } from './tables';
import { contentTypesOf, metadataOf } from '../utils/typed-strapi';

const PAGE = 1000;
/** Rows per insert: SQLite takes at most 999 values in one statement */
const VALUES_PER_STATEMENT = 900;

const USERS_TABLE = 'eu_users';
const ROLES_TABLE = 'eu_roles';
const STAGED_PERMISSIONS = 'up_permissions';
const STAGED_PERMISSION_LINK = 'up_permissions_role_lnk';
const STAGED_COMPONENTS = 'up_users_cmps';
const PUBLIC_ROLES = ['public', 'authenticated'];
const NO_ADDRESS_DOMAIN = '@users.invalid';

type Row = Record<string, unknown>;
type DbClient = 'sqlite' | 'postgres' | 'mysql';

export interface PostSyncStep {
  name: MigrationStep;
  /** `owner` is this start's claim, which a step that writes the record in its own transaction checks */
  run: (
    strapi: Core.Strapi,
    record: MigrationRecord,
    owner: string
  ) => Promise<Partial<MigrationRecord> | void>;
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

const tableOf = (strapi: Core.Strapi, trx: Knex, table: string) => {
  const schema = strapi.db.getSchemaName();

  return schema ? trx(table).withSchema(schema) : trx(table);
};

const qualified = (strapi: Core.Strapi, table: string) => {
  const schema = strapi.db.getSchemaName();

  return schema ? `${schema}.${table}` : table;
};

const clientOf = (strapi: Core.Strapi) => strapi.db.dialect.client as DbClient;

const hasColumn = (strapi: Core.Strapi, table: string, column: string) =>
  strapi.db.getSchemaConnection().hasColumn(table, column);

/** The singular name of the type a relation points at, which decides how its link columns are named */
const targetSingularName = (strapi: Core.Strapi, attribute: { target?: string }) =>
  attribute.target
    ? (strapi.db.metadata.get(attribute.target) as unknown as { singularName?: string })
        ?.singularName
    : undefined;

const meta = (strapi: Core.Strapi, uid: string) => {
  const found = metadataOf<{
    tableName: string;
    attributes: Record<string, any>;
  }>(strapi.db, uid);

  return found;
};

const columnOf = (strapi: Core.Strapi, uid: string, attribute: string): string | undefined =>
  meta(strapi, uid).attributes[attribute]?.columnName;

const chunksOf = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let from = 0; from < items.length; from += size) {
    chunks.push(items.slice(from, from + size));
  }

  return chunks;
};

const stagedAs = (record: MigrationRecord, original: string): string | undefined =>
  Object.entries(record.staged).find(([, from]) => from === original)?.[0];

/** Inside a transaction: the record still names this start. Reads through the transaction. */
const stillHeld = async (strapi: Core.Strapi, owner: string): Promise<MigrationRecord> => {
  const record = await readRecord(strapi);

  if (!record || record.claim?.by !== owner) {
    throw new Error(
      'This start no longer holds the migration: another start claimed it. Nothing more was written.'
    );
  }

  return record;
};

/** Writes `patch` over the record, only while this start still holds the claim */
export const writeFenced = async (
  strapi: Core.Strapi,
  owner: string,
  patch: Partial<MigrationRecord>
): Promise<MigrationRecord> => {
  await stillHeld(strapi, owner);

  return updateRecord(strapi, patch);
};

/* -------------------------------------------------------------------------------------------------
 * users
 * -----------------------------------------------------------------------------------------------*/

const NOT_FILLED_FROM_MODEL = new Set(['emailVerified', 'banned', 'documentId']);

/** The model defaults a plain value can carry: a boolean, a number or a string */
const plainDefault = (value: unknown): string | number | boolean | undefined =>
  typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
    ? value
    : undefined;

const usersStep = async (strapi: Core.Strapi, _record: MigrationRecord, owner: string) => {
  const db = strapi.db;
  const emailVerified = columnOf(strapi, USER_UID, 'emailVerified') ?? 'email_verified';
  const banned = columnOf(strapi, USER_UID, 'banned') ?? 'banned';
  const conn = () => db.getConnection(USERS_TABLE);

  const fromOld = async (target: string, old: string) => {
    const has = await hasColumn(strapi, USERS_TABLE, old);

    await conn().update({
      [target]: has ? db.connection.raw('COALESCE(??, ?)', [old, false]) : false,
    });
  };

  await fromOld(emailVerified, 'confirmed');
  await conn()
    .whereRaw('LOWER(??) LIKE ?', ['email', `%${NO_ADDRESS_DOMAIN}`])
    .update({ [emailVerified]: false });
  await fromOld(banned, 'blocked');

  // A user with no name is named after the username they signed up with, the spelling they chose first
  const sources = [];

  for (const column of ['display_username', 'username']) {
    if (await hasColumn(strapi, USERS_TABLE, column)) {
      sources.push(column);
    }
  }

  const nameColumn = columnOf(strapi, USER_UID, 'name');

  if (nameColumn && sources.length > 0) {
    await conn()
      .whereNull(nameColumn)
      .update({
        [nameColumn]: db.connection.raw(`COALESCE(${sources.map(() => '??').join(', ')})`, sources),
      });
  }

  // Every other column the engine added, with the default its model gives a new user
  const attributes =
    contentTypesOf<Record<string, { attributes?: Record<string, any> }>>(strapi)[USER_UID]
      ?.attributes;

  for (const [name, attribute] of Object.entries(attributes ?? {})) {
    const value = plainDefault(attribute.default);
    const column = columnOf(strapi, USER_UID, name);

    if (
      value !== undefined &&
      column &&
      !NOT_FILLED_FROM_MODEL.has(name) &&
      attribute.type !== 'relation' &&
      (await hasColumn(strapi, USERS_TABLE, column))
    ) {
      await conn()
        .whereNull(column)
        .update({ [column]: value });
    }
  }

  // Pages of rows with no document id, each given the id a new document of the type would get
  const makeId = meta(strapi, USER_UID).attributes.documentId?.default as
    (() => string) | undefined;

  if (typeof makeId === 'function') {
    for (;;) {
      await keepHold(strapi, owner);

      const page: Row[] = await conn().whereNull('document_id').select('id').limit(PAGE);

      if (page.length === 0) {
        break;
      }

      for (const { id } of page) {
        await conn().where({ id }).update({ document_id: makeId() });
      }
    }
  }
};

/* -------------------------------------------------------------------------------------------------
 * roles
 * -----------------------------------------------------------------------------------------------*/

const rolesStep = async (strapi: Core.Strapi, record: MigrationRecord, owner: string) => {
  const db = strapi.db;
  const typeColumn = columnOf(strapi, ROLE_UID, 'type') ?? 'type';
  const roles = () => db.getConnection(ROLES_TABLE);
  let defaultRoleDocumentId = record.carried.defaultRoleDocumentId;

  if (defaultRoleDocumentId === null) {
    const advanced = (await strapi
      .store({ type: 'plugin', name: 'users-permissions' })
      .get({ key: 'advanced' })) as { default_role?: unknown } | null;
    const wanted =
      typeof advanced?.default_role === 'string' ? advanced.default_role : 'authenticated';
    const role = (await roles()
      .where({ [typeColumn]: wanted })
      .orderBy('id')
      .first('document_id')) as { document_id: string } | undefined;

    defaultRoleDocumentId = role?.document_id ?? null;
  }

  const carried = { ...record.carried, defaultRoleDocumentId };

  // The retype and its record commit together: a rollback restores the types only when the record
  // names this step, so a start stopped between the two writes must leave neither behind
  await keepHold(strapi, owner);
  await db.transaction(async ({ trx }: { trx: Knex.Transaction }) => {
    const held = await stillHeld(strapi, owner);

    await tableOf(strapi, trx, ROLES_TABLE)
      .whereNotIn(typeColumn, PUBLIC_ROLES)
      .update({ [typeColumn]: 'custom' });
    await updateRecord(strapi, {
      carried,
      completedSteps: [...new Set([...held.completedSteps, 'roles' as const])],
    });
  });

  return { carried };
};

/* -------------------------------------------------------------------------------------------------
 * permissions
 * -----------------------------------------------------------------------------------------------*/

const permissionContext = (strapi: Core.Strapi): PermissionMapContext => {
  const types = contentTypesOf<Record<string, { options?: { draftAndPublish?: boolean } }>>(strapi);
  const { action } = strapi.contentAPI.permissions.providers;

  return {
    compat: readCompatConfig(strapi).usersPermissions,
    contentTypes: Object.fromEntries(
      Object.entries(types)
        .filter(([uid]) => uid.startsWith('api::'))
        .map(([uid, type]) => [uid, { draftAndPublish: type.options?.draftAndPublish === true }])
    ),
    fields: (uid, use) =>
      use === 'write' ? writableFields(strapi, uid) : readableFields(strapi, uid),
    isKnownAction: (name) => action.has(name),
  };
};

const permissionsStep = async (strapi: Core.Strapi, record: MigrationRecord, owner: string) => {
  const staged = stagedAs(record, STAGED_PERMISSIONS);
  const link = stagedAs(record, STAGED_PERMISSION_LINK);

  if (!staged || !link) {
    strapi.log.warn(
      `${PLUGIN_ID}: the users-permissions permission tables are not staged, so no role permissions were carried`
    );

    return;
  }

  const service = strapi.plugin(PLUGIN_ID).service('permission') as ReturnType<
    typeof permissionService
  >;
  const context = permissionContext(strapi);
  const db = strapi.db;
  const roles = (await db
    .getConnection(ROLES_TABLE)
    .select('id', 'document_id', 'name', 'type')
    .orderBy('id')) as Array<{ id: number; document_id: string; name: string; type: string }>;
  const items = [];
  let written = 0;

  for (const role of roles) {
    await keepHold(strapi, owner);

    const found: Row[] = await db
      .getConnection(`${link} as l`)
      .join(`${staged} as p`, 'p.id', 'l.permission_id')
      .where('l.role_id', role.id)
      .orderBy('p.id')
      .select('p.action as action');
    const actions = found.map((row) => String(row.action));
    const mapping = mapRolePermissions(actions, role.type, context);

    // The role's rows are replaced as a whole, so a start that runs this again leaves the same ones
    const existing = await service.findForRoles([role.document_id]);

    await service.applyDiff(role.document_id, {
      create: mapping.rows,
      update: [],
      delete: existing.map((row) => row.documentId),
    });
    written += mapping.rows.length;

    items.push(
      ...permissionItems(
        { roles: [{ id: role.id, name: role.name, type: role.type, actions, users: 0 }] },
        { permissionContext: context }
      )
    );
  }

  await addReportItems(strapi, items);
  strapi.log.info(`${PLUGIN_ID}: wrote ${written} permissions for ${roles.length} roles`);
};

/* -------------------------------------------------------------------------------------------------
 * profiles
 * -----------------------------------------------------------------------------------------------*/

const NON_SCALAR = new Set(['relation', 'component', 'dynamiczone', 'media']);

/** What the profile gets of its own, never from the user's row: ids, document id, timestamps, authors, locale */
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
    .map(([name]) => columnOf(strapi, PROFILE_UID, name))
    .filter((column): column is string => column !== undefined && !OWN_COLUMNS.has(column));
};

interface CopyPlan {
  /** The staged table's original name */
  from: string;
  /** The profile's table that takes its rows */
  into: string;
  /** The column of the profile's table that holds the profile id */
  key: string;
  /** The column of the staged table that a column of the profile's table takes its values from */
  source: (column: string) => string;
}

/** The staged tables the profile declares, and the profile tables that take them */
const declaredCopies = (strapi: Core.Strapi): CopyPlan[] => {
  const profile = meta(strapi, PROFILE_UID);
  const plans: CopyPlan[] = [];

  for (const [name, attribute] of Object.entries(profile.attributes)) {
    if (name === 'user') {
      continue;
    }

    if (attribute.type === 'relation' && attribute.joinTable) {
      const { joinTable } = attribute;

      // A table the other side of the relation owns is not the profile's to carry
      if (joinTable.joinColumn?.referencedTable === profile.tableName) {
        plans.push({
          from: upJoinTableName(strapi.db, name),
          into: joinTable.name,
          key: joinTable.joinColumn.name,
          source: (column) =>
            upLinkColumn(
              joinTable,
              column,
              attribute.relation,
              targetSingularName(strapi, attribute)
            ),
        });
      }
    }
  }

  const components = [...strapi.db.metadata.values()].find(
    (model: any) => model.tableName === `${profile.tableName}_cmps`
  );

  if (components) {
    plans.push({
      from: STAGED_COMPONENTS,
      into: components.tableName,
      key: 'entity_id',
      source: (column) => column,
    });
  }

  return plans;
};

/** Users per statement */
const ID_RANGE = 1000;

const createProfiles = async (strapi: Core.Strapi, owner: string): Promise<number> => {
  const db = strapi.db;
  const profile = meta(strapi, PROFILE_UID);
  const userLink = profile.attributes.user.joinTable as {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };
  const makeId = profile.attributes.documentId.default as () => string;
  const withPublished =
    Boolean(profile.attributes.publishedAt) &&
    (await hasColumn(strapi, USERS_TABLE, 'published_at'));
  const columns: string[] = [];

  for (const column of profileScalars(strapi)) {
    if (await hasColumn(strapi, USERS_TABLE, column)) {
      columns.push(column);
    }
  }

  // What the profile takes from the user table, recorded so the cleanup drops these and no other custom column
  const held = await stillHeld(strapi, owner);

  await writeFenced(strapi, owner, {
    carried: {
      ...held.carried,
      columns: [...new Set([...held.carried.columns, ...columns])],
    },
  });

  const targets = [
    'id',
    'document_id',
    ...columns,
    'created_at',
    'updated_at',
    ...(withPublished ? ['published_at'] : []),
  ];
  const bounds = (await db
    .getConnection(USERS_TABLE)
    .min({ lo: 'id' })
    .max({ hi: 'id' })
    .first()) as { lo: number | null; hi: number | null } | undefined;
  let created = 0;

  for (
    let from = Number(bounds?.lo ?? 1);
    bounds?.hi != null && from <= Number(bounds.hi);
    from += ID_RANGE
  ) {
    const to = from + ID_RANGE - 1;

    await keepHold(strapi, owner);

    created += await db.transaction(async ({ trx }: { trx: Knex.Transaction }): Promise<number> => {
      const withoutProfile = (query: Knex.QueryBuilder) =>
        query.whereBetween('u.id', [from, to]).whereNotExists(function none() {
          this.select(trx.raw('1'))
            .from(userLink.name)
            .whereRaw('?? = ??', [`${userLink.name}.${userLink.inverseJoinColumn.name}`, 'u.id']);
        });

      const ids = (
        (await withoutProfile(tableOf(strapi, trx, `${USERS_TABLE} as u`)).select(
          'u.id as id'
        )) as Row[]
      ).map((row) => Number(row.id));

      if (ids.length === 0) {
        return 0;
      }

      // Column values move as the database holds them (JSON included): one statement per range.
      // The user's own document id stands in until each profile gets the one its model gives.
      const select = withoutProfile(tableOf(strapi, trx, `${USERS_TABLE} as u`)).select([
        'u.id',
        'u.document_id',
        ...columns.map((column) => `u.${column}`),
        'u.created_at',
        'u.updated_at',
        ...(withPublished ? [trx.raw('COALESCE(??, ?)', ['u.published_at', new Date()])] : []),
      ]);

      await trx
        .into(
          trx.raw(`?? (${targets.map(() => '??').join(', ')})`, [
            qualified(strapi, profile.tableName),
            ...targets,
          ])
        )
        .insert(select);
      await trx
        .into(
          trx.raw('?? (??, ??)', [
            qualified(strapi, userLink.name),
            userLink.joinColumn.name,
            userLink.inverseJoinColumn.name,
          ])
        )
        .insert(trx.select('u.id', 'u.id').from(`${USERS_TABLE} as u`).whereIn('u.id', ids));

      for (const id of ids) {
        await tableOf(strapi, trx, profile.tableName)
          .where({ id })
          .update({ document_id: makeId() });
      }

      return ids.length;
    });
  }

  // Postgres counts on from its own sequence, which explicit ids did not move
  if (clientOf(strapi) === 'postgres') {
    await db.connection.raw(
      `select setval(pg_get_serial_sequence(?, 'id'), (select max(id) from ??)) where exists (select 1 from ??)`,
      [
        qualified(strapi, profile.tableName),
        qualified(strapi, profile.tableName),
        qualified(strapi, profile.tableName),
      ]
    );
  }

  return created;
};

const dropStaged = async (strapi: Core.Strapi, table: string) => {
  if (clientOf(strapi) === 'postgres') {
    await strapi.db.connection.raw('drop table if exists ?? cascade', [qualified(strapi, table)]);
  } else {
    await strapi.db.getSchemaConnection().dropTableIfExists(table);
  }
};

/** The profile's table takes the rows of its staged one, and the record says so, in one transaction */
const copyStaged = async (
  strapi: Core.Strapi,
  owner: string,
  stagedName: string,
  plan: CopyPlan
): Promise<void> => {
  const db = strapi.db;
  const from = Object.keys((await db.getConnection(stagedName).columnInfo()) as object);
  const to = Object.keys((await db.getConnection(plan.into).columnInfo()) as object);
  const pairs = to
    .filter((column) => column !== 'id')
    .map((column) => ({ column, source: plan.source(column) }))
    .filter(({ source }) => from.includes(source));
  const sourceKey = plan.source(plan.key);

  await keepHold(strapi, owner);
  await db.transaction(async ({ trx }: { trx: Knex.Transaction }) => {
    const record = await stillHeld(strapi, owner);

    if (record.carried.copied.includes(stagedName)) {
      return;
    }

    const select = tableOf(strapi, trx, stagedName)
      .select(pairs.map(({ source }) => source))
      .whereIn(sourceKey, tableOf(strapi, trx, meta(strapi, PROFILE_UID).tableName).select('id'));
    const target = qualified(strapi, plan.into);

    await trx
      .into(
        trx.raw(`?? (${pairs.map(() => '??').join(', ')})`, [
          target,
          ...pairs.map(({ column }) => column),
        ])
      )
      .insert(select);
    await updateRecord(strapi, {
      carried: { ...record.carried, copied: [...record.carried.copied, stagedName] },
    });
  });
};

const profilesStep = async (strapi: Core.Strapi, record: MigrationRecord, owner: string) => {
  const db = strapi.db;
  const plans = declaredCopies(strapi);
  const declared = new Set(plans.map(({ from }) => from));
  const items = [];

  for (const [stagedName, original] of Object.entries(record.staged)) {
    if (
      original === STAGED_PERMISSIONS ||
      original === STAGED_PERMISSION_LINK ||
      declared.has(original)
    ) {
      continue;
    }

    const rows = Number(
      ((await db.getConnection(stagedName).count({ c: '*' }).first()) as Row | undefined)?.c ?? 0
    );

    items.push({
      id: `staged-undeclared:${original}`,
      kind: 'staged-undeclared' as const,
      severity: 'action' as const,
      message:
        `The users-permissions table ${original} holds ${rows} ${rows === 1 ? 'row' : 'rows'} the ` +
        `profile does not declare, so it was kept as ${stagedName}. Add the matching field to the ` +
        'profile and copy its rows, or drop the table once nothing needs it.',
      count: rows,
      refs: [original],
      resolved: false,
    });
  }

  await addReportItems(strapi, items);

  const created = await createProfiles(strapi, owner);

  for (const plan of plans) {
    const stagedName = stagedAs(record, plan.from);

    if (stagedName) {
      if (await db.getSchemaConnection().hasTable(stagedName)) {
        const { carried } = (await readRecord(strapi)) ?? record;

        if (!carried.copied.includes(stagedName)) {
          await copyStaged(strapi, owner, stagedName, plan);
        }

        await dropStaged(strapi, stagedName);
      }
    }
  }

  strapi.log.info(`${PLUGIN_ID}: created ${created} profiles`);
};

/* -------------------------------------------------------------------------------------------------
 * accounts
 * -----------------------------------------------------------------------------------------------*/

const accountsStep = async (strapi: Core.Strapi, _record: MigrationRecord, owner: string) => {
  const db = strapi.db;
  const account = meta(strapi, ACCOUNT_UID);
  const column = (attribute: string) => account.attributes[attribute]?.columnName as string;
  const makeId = account.attributes.documentId.default as () => string;
  const withPublished =
    Boolean(account.attributes.publishedAt) &&
    (await hasColumn(strapi, USERS_TABLE, 'published_at'));
  const providerId = column('providerId');
  const accountId = column('accountId');
  const userId = column('userId');
  const width = 9;
  let lastId = 0;
  let created = 0;

  for (;;) {
    await keepHold(strapi, owner);

    const page = (await db
      .getConnection(`${USERS_TABLE} as u`)
      .where('u.provider', 'local')
      .whereNotNull('u.password')
      .where('u.password', '<>', '')
      .where('u.id', '>', lastId)
      .whereNotExists(function none() {
        this.select(db.connection.raw('1'))
          .from(account.tableName)
          // The account id is the user's id, so this matches the (provider, account) unique index
          // in full. On `user_id` alone SQLite picks that index by `provider_id` and scans every
          // credential account once for each user: quadratic, 25 minutes at 100,000 users
          .whereRaw('?? = ??', [`${account.tableName}.${accountId}`, 'u.document_id'])
          .where(`${account.tableName}.${providerId}`, 'credential');
      })
      .orderBy('u.id')
      .limit(PAGE)
      .select(
        'u.id as id',
        'u.document_id as document_id',
        'u.password as password',
        'u.created_at as created_at',
        'u.updated_at as updated_at',
        ...(withPublished ? ['u.published_at as published_at'] : [])
      )) as Row[];

    if (page.length === 0) {
      break;
    }

    lastId = Number(page[page.length - 1].id);

    for (const chunk of chunksOf(page, Math.floor(VALUES_PER_STATEMENT / width))) {
      await db.getConnection(account.tableName).insert(
        chunk.map((user) => ({
          document_id: makeId(),
          [providerId]: 'credential',
          [accountId]: user.document_id,
          [userId]: user.document_id,
          [column('password')]: user.password,
          created_at: user.created_at,
          updated_at: user.updated_at,
          ...(withPublished ? { published_at: user.published_at ?? new Date() } : {}),
        }))
      );
    }

    created += page.length;
  }

  strapi.log.info(`${PLUGIN_ID}: created ${created} credential accounts`);
};

/* -------------------------------------------------------------------------------------------------
 * The run
 * -----------------------------------------------------------------------------------------------*/

export const POST_SYNC_STEPS: PostSyncStep[] = [
  { name: 'users', run: usersStep },
  { name: 'roles', run: rolesStep },
  { name: 'permissions', run: permissionsStep },
  { name: 'profiles', run: profilesStep },
  { name: 'accounts', run: accountsStep },
  storesStep,
  adminStep,
];

/**
 * Ends the migration: the report is stamped, the record becomes `completed` with the cutover (which
 * the compatibility mode reads, so the legacy tokens are judged by it from now on), the claim is
 * given up and one line of counts is logged. `owner` is the claim this start holds; the record is
 * written only while it still does.
 */
export const finishMigration = async (
  strapi: Core.Strapi,
  owner: string | undefined = lastClaimOwner(strapi)
): Promise<void> => {
  const now = new Date().toISOString();
  const report = await readReport(strapi);

  if (report) {
    await writeReport(strapi, { ...report, generatedAt: now });
  } else {
    strapi.log.warn(`${PLUGIN_ID}: the migration report is not stored`);
  }

  const record = (await readRecord(strapi)) as MigrationRecord;
  const patch: Partial<MigrationRecord> = {
    status: 'completed',
    cutoverAt: record.cutoverAt ?? now,
    completedAt: now,
  };

  await (owner ? writeFenced(strapi, owner, patch) : updateRecord(strapi, patch));
  (strapi.plugin(PLUGIN_ID).service('compat') as { clearCutoverCache(): void }).clearCutoverCache();

  if (owner) {
    await releaseMigration(strapi, owner);
  }

  const items = report?.items ?? [];
  const open = items.filter((entry) => entry.severity === 'action' && !entry.resolved).length;

  strapi.log.info(
    `${PLUGIN_ID}: migration completed: ${report?.counts.users ?? 0} users, ${report?.counts.roles ?? 0} roles, ${items.length} report items, ${open} to act on`
  );
};

/**
 * The claim to run under: the one the pre-sync took in this start (it is not given back until the
 * migration is finished), or a new one, waited for while another start holds it. `null` when the
 * other start finished the migration meanwhile.
 */
const takeClaim = async (strapi: Core.Strapi): Promise<string | null> => {
  const record = await readRecord(strapi);
  const mine = lastClaimOwner(strapi);

  if (mine && record?.claim?.by === mine && (await claimMigration(strapi, mine))) {
    return mine;
  }

  const owner = randomUUID();
  let announced = false;
  const outcome = await waitForClaim({
    claim: () => claimMigration(strapi, owner),
    completed: async () => (await readRecord(strapi))?.status === 'completed',
    onWait() {
      if (!announced) {
        announced = true;
        strapi.log.info(`${PLUGIN_ID}: another start is running the migration; waiting for it`);
      }
    },
  });

  if (outcome === 'timeout') {
    throw new Error(
      'Another start has held the migration for 15 minutes without finishing it. Check that it is ' +
        'still running, then deploy again.'
    );
  }

  return outcome === 'claimed' ? owner : null;
};

/**
 * A failed query's message holds its SQL and bound values (columns of a profile, ids, hashes). The
 * log gets the step and the database's error code; the error that goes on carries no query text.
 */
const isDatabaseError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && ('sql' in error || 'code' in error);

const withoutQuery = (strapi: Core.Strapi, step: string, error: unknown): Error => {
  const { code } = (error ?? {}) as { code?: unknown };
  const named = typeof code === 'string' || typeof code === 'number' ? ` (error code ${code})` : '';
  const message = `The migration step "${step}" failed${named}. Nothing was recorded for it.`;

  strapi.log.error(`${PLUGIN_ID}: ${message}`);

  return new Error(message);
};

/**
 * The migration's second half, in the plugin's bootstrap and before anything creates profiles or
 * roles: the users' new columns, the roles' types, the roles' permissions with the fixes, a profile
 * for each user (with the user's id) and a credential account for each user with a password. Does
 * nothing unless the record is in progress with the pre-sync done. Each step runs once, is recorded
 * in `completedSteps`, and may run again after a stop without changing what it already wrote. The
 * last two carry the stores (settings, emails, providers) and the admin side; then the migration is
 * finished.
 */
export const runPostSync = async (strapi: Core.Strapi): Promise<void> => {
  const first = await readRecord(strapi);

  if (!first || first.status !== 'in-progress' || !first.completedSteps.includes('pre-sync')) {
    return;
  }

  const owner = await takeClaim(strapi);

  if (owner === null) {
    return;
  }

  try {
    for (const step of POST_SYNC_STEPS) {
      // A step reads the record as the one before left it
      const record = await readRecord(strapi);

      if (!record || record.status !== 'in-progress') {
        return;
      }

      if (!record.completedSteps.includes(step.name)) {
        await keepHold(strapi, owner);

        let patch: Partial<MigrationRecord> | void;

        try {
          patch = (await step.run(strapi, record, owner)) ?? {};
        } catch (error) {
          throw isDatabaseError(error) ? withoutQuery(strapi, step.name, error) : error;
        }

        const current = await stillHeld(strapi, owner);

        await updateRecord(strapi, {
          ...patch,
          completedSteps: [...new Set([...current.completedSteps, step.name])],
        });
      }
    }

    await finishMigration(strapi, owner);
  } finally {
    await releaseMigration(strapi, owner);
  }
};
