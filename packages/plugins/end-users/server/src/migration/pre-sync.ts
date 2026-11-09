// knex is Strapi's own database layer (hoisted); only its types are used here
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import type { Knex } from 'knex';
import type { Core } from '@strapi/types';
import type { Database } from '@strapi/database';

import { PLUGIN_ID, PROFILE_UID } from '../constants';
import { BUILT_IN_PROVIDERS } from '../providers/built-in';
import { planRewrites, groupDuplicates } from './dedupe';
import type { RewriteRule } from './dedupe';
import type { MigrationConfig } from './config';
import type { MigrationContext, MigrationStepFn } from './control';
import { claimMigration, readRecord, readReport, updateRecord, writeReport } from './record';
import type { MigrationRecord } from './record';
import { buildReport } from './report';
import type { ReportContext } from './report';
import { duplicatesQuery, readUpSnapshot } from './snapshot';
import type { DbClient, DuplicateGroup, UpSnapshot } from './snapshot';
import { RENAMED, planStaging } from './tables';

export { RENAMED, stagingName, upJoinTableName } from './tables';

const UP_USER_UID = 'plugin::users-permissions.user';
const PAGE = 1000;
const NEXT_ATTEMPT_EMPTIES = ['eu_profiles', 'eu_accounts'];

type Row = Record<string, unknown>;

/**
 * What stops the migration before it changes anything, as words for the person who deploys, or
 * `null` when it may go ahead: a user column Strapi can't fill, or duplicates with the setting
 * that says to stop on them.
 */
export const refusalOf = (snapshot: UpSnapshot, config: MigrationConfig): string | null => {
  if (snapshot.notNullColumns.length > 0) {
    return (
      `The users-permissions user table has columns that must be set and have no default: ` +
      `${snapshot.notNullColumns.join(', ')}. The migration cannot create users without them. ` +
      'Give each column a default, or make it optional, then deploy again.'
    );
  }

  const emails = snapshot.duplicateEmails.length;
  const names = snapshot.duplicateUsernames.length;

  if (config.duplicates === 'abort' && emails + names > 0) {
    return (
      'migration.duplicates is "abort" and some users share an email address or a username once ' +
      `capitals are ignored: ${emails} email group${emails === 1 ? '' : 's'} and ${names} username ` +
      `group${names === 1 ? '' : 's'}. Set migration.duplicates to "keep-oldest" to keep the ` +
      'oldest user of each group and rewrite the others, or merge them first, then deploy again.'
    );
  }

  return null;
};

/**
 * Before the migration is registered: reads what would be migrated, refuses what can't be, and
 * takes the claim. Runs outside the migration's transaction on purpose: a claim written inside it
 * would not be visible to another start, and on SQLite a second connection can't be opened while
 * the transaction holds the only one. Returns the refusal, or `null` when this start holds the
 * migration.
 */
export const claimPreSync = async (
  strapi: Core.Strapi,
  config: MigrationConfig,
  owner: string
): Promise<string | null> => {
  const client = strapi.db.dialect.client as DbClient;
  const snapshot = await readUpSnapshot(strapi.db.connection, client);
  const refusal = refusalOf(snapshot, config);

  if (refusal) {
    return refusal;
  }

  return (await claimMigration(strapi, owner))
    ? null
    : 'Another start holds the migration (its claim lasts 15 minutes). Wait for it to finish, or ' +
        'for the claim to run out, then deploy again.';
};

/* -------------------------------------------------------------------------------------------------
 * Report
 * -----------------------------------------------------------------------------------------------*/

const SYSTEM_FIELDS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

const reportContext = (strapi: Core.Strapi, ctx: MigrationContext, client: DbClient) => {
  const types = strapi.contentTypes as unknown as Record<
    string,
    { options?: { draftAndPublish?: boolean }; attributes?: Record<string, { private?: boolean }> }
  >;

  const context: ReportContext = {
    source: 'migration',
    client,
    compat: ctx.compat,
    now: ctx.now(),
    permissionContext: {
      compat: ctx.compat,
      contentTypes: Object.fromEntries(
        Object.entries(types)
          .filter(([uid]) => uid.startsWith('api::'))
          .map(([uid, type]) => [uid, { draftAndPublish: type.options?.draftAndPublish === true }])
      ),
      fields: (uid, use) =>
        Object.entries(types[uid]?.attributes ?? {})
          .filter(
            ([name, attribute]) =>
              !attribute.private && (use === 'read' || !SYSTEM_FIELDS.has(name))
          )
          .map(([name]) => name),
      // The Content API routes are not all registered yet: each action is decided afterwards
      isKnownAction: () => null,
    },
    requiredProviderFields(id) {
      const definition = BUILT_IN_PROVIDERS.find((provider) => provider.id === id);

      return definition
        ? Object.entries(definition.fields ?? {})
            .filter(([, field]) => field.required)
            .map(([name]) => name)
        : null;
    },
    graphqlNullable: [],
    configKeys: [],
    codeFindings: [],
  };

  return context;
};

/* -------------------------------------------------------------------------------------------------
 * Tables
 * -----------------------------------------------------------------------------------------------*/

/** The tables whose name starts with `prefix` (which holds no wildcard but the underscore) */
const tablesStartingWith = async (
  trx: Knex,
  client: DbClient,
  prefix: string
): Promise<string[]> => {
  const like = `${prefix.replace(/_/g, '!_')}%`;
  let rows: Row[];

  if (client === 'sqlite') {
    rows = await trx('sqlite_master')
      .select('name')
      .where('type', 'table')
      .whereRaw("name LIKE ? ESCAPE '!'", [like]);
  } else {
    const schema = client === 'postgres' ? 'current_schema()' : 'database()';

    rows = await trx('information_schema.tables')
      .select('table_name as name')
      .whereRaw(`table_schema = ${schema}`)
      .andWhere('table_type', 'BASE TABLE')
      .andWhereRaw("table_name LIKE ? ESCAPE '!'", [like]);
  }

  return rows.map((row) => String(row.name));
};

const tableOf = (trx: Knex, db: Database, table: string) => {
  const schema = db.getSchemaName();

  return schema ? trx(table).withSchema(schema) : trx(table);
};

/** Postgres keeps a table's id sequence under its old name after a rename */
const renamePostgresSequence = async (trx: Knex, db: Database, from: string, to: string) => {
  const schema = db.getSchemaName();
  const qualified = (name: string) => (schema ? `${schema}.${name}` : name);
  const sequence = `select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and c.relname = ? and n.nspname = current_schema()`;
  const has = async (name: string) =>
    ((await trx.raw(sequence, [name])) as { rows: Row[] }).rows.length > 0;

  if ((await has(`${from}_id_seq`)) && !(await has(`${to}_id_seq`))) {
    await trx.raw('ALTER SEQUENCE ?? RENAME TO ??', [qualified(`${from}_id_seq`), `${to}_id_seq`]);
  }
};

/** The names of a table's indexes and constraints (SQLite and MySQL: indexes and foreign keys) */
const schemaObjectNames = async (trx: Knex, client: DbClient, table: string): Promise<string[]> => {
  if (client === 'sqlite') {
    const indexes = (await trx.raw('pragma index_list(??)', [table])) as Row[];

    return indexes.map((row) => String(row.name));
  }

  if (client === 'postgres') {
    const result = (await trx.raw(
      `select c.conname as name from pg_constraint c
         join pg_class t on t.oid = c.conrelid
         join pg_namespace n on n.oid = t.relnamespace
         where n.nspname = current_schema() and t.relname = ?
       union
       select indexname as name from pg_indexes
         where schemaname = current_schema() and tablename = ?`,
      [table, table]
    )) as { rows: Row[] };

    return result.rows.map((row) => String(row.name));
  }

  const [rows] = (await trx.raw(
    `select index_name as name from information_schema.statistics
       where table_schema = database() and table_name = ?
     union
     select constraint_name as name from information_schema.table_constraints
       where table_schema = database() and table_name = ? and constraint_type = 'FOREIGN KEY'`,
    [table, table]
  )) as [Row[]];

  return rows.map((row) => String(row.name));
};

/**
 * Brings the indexes, keys and constraints that still carry the old table's name in line with the
 * new one: renamed where the database can (Postgres), dropped where it can't (the schema sync
 * builds them again under the new name). Left alone they would sit beside the new ones.
 */
const renameSchemaObjects = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  from: string,
  to: string
) => {
  const prefix = `${from}_`;
  const names = (await schemaObjectNames(trx, client, to)).filter((name) =>
    name.startsWith(prefix)
  );

  for (const name of new Set(names)) {
    if (db.dialect.canRenameSchemaObjects()) {
      // eslint-disable-next-line no-await-in-loop
      await db.dialect.renameSchemaObject(trx, {
        table: to,
        from: name,
        to: `${to}_${name.slice(prefix.length)}`,
      });
    } else {
      // eslint-disable-next-line no-await-in-loop
      await db.dialect.dropSchemaObject(trx, { table: to, name });
    }
  }
};

const renameTables = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  pairs: Array<[from: string, to: string]>,
  { keys }: { keys: boolean }
) => {
  for (const [from, to] of pairs) {
    // eslint-disable-next-line no-await-in-loop
    await db.schema.renameTable(trx, { from, to });
  }

  // A table that is not in the new schema yet is not touched by the sync: its old names stay
  if (keys) {
    for (const [from, to] of pairs) {
      // eslint-disable-next-line no-await-in-loop
      await renameSchemaObjects(trx, db, client, from, to);

      if (client === 'postgres') {
        // eslint-disable-next-line no-await-in-loop
        await renamePostgresSequence(trx, db, from, to);
      }
    }
  }
};

/** Empties the profile's and the account's tables, children first, so profiles are built again */
const emptyProfileTables = async (trx: Knex, db: Database, client: DbClient): Promise<number> => {
  let removed = 0;

  for (const base of NEXT_ATTEMPT_EMPTIES) {
    // eslint-disable-next-line no-await-in-loop
    const found = await tablesStartingWith(trx, client, base);
    const children = found.filter((name) => name.startsWith(`${base}_`));

    for (const name of [...children, ...found.filter((name) => name === base)]) {
      // eslint-disable-next-line no-await-in-loop
      removed += Number(await tableOf(trx, db, name).del());
    }
  }

  return removed;
};

/* -------------------------------------------------------------------------------------------------
 * Users, roles, media
 * -----------------------------------------------------------------------------------------------*/

const groupsOf = async (
  trx: Knex,
  db: Database,
  table: string,
  column: string
): Promise<DuplicateGroup[]> => {
  const rows = (await duplicatesQuery(trx, table, column)) as Array<{ id: unknown; k: unknown }>;

  return groupDuplicates(rows.map((row) => ({ id: Number(row.id), k: String(row.k) })));
};

const rewriteGroups = async (
  trx: Knex,
  db: Database,
  table: string,
  column: string,
  rule: RewriteRule,
  groups: DuplicateGroup[]
): Promise<number> => {
  const ids = groups.flatMap((group) => group.rewrite);
  const values = new Map<number, string>();

  for (let from = 0; from < ids.length; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const rows: Row[] = await tableOf(trx, db, table)
      .whereIn('id', ids.slice(from, from + PAGE))
      .select('id', column);

    for (const row of rows) {
      values.set(Number(row.id), String(row[column] ?? ''));
    }
  }

  for (const { id, value } of planRewrites(groups, rule, values)) {
    // eslint-disable-next-line no-await-in-loop
    await tableOf(trx, db, table)
      .where({ id })
      .update({ [column]: value });
  }

  return ids.length;
};

/** One statement: every row whose value is not already in lower case. MySQL compares caselessly, so it compares bytes. */
const lowercase = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  table: string,
  column: string
): Promise<number> => {
  const differs =
    client === 'mysql' ? 'CAST(?? AS BINARY) <> CAST(LOWER(??) AS BINARY)' : '?? <> LOWER(??)';

  return Number(
    await tableOf(trx, db, table)
      .whereRaw(differs, [column, column])
      .update({ [column]: trx.raw('LOWER(??)', [column]) })
  );
};

const migrateUsers = async (trx: Knex, db: Database, client: DbClient) => {
  const schema = db.getSchemaConnection(trx);

  if (!(await schema.hasColumn('eu_users', 'display_username'))) {
    await db.getSchemaConnection(trx).alterTable('eu_users', (table) => {
      table.string('display_username');
    });
  }

  // The spelling is kept before the username is lower-cased; rows already filled keep theirs
  await tableOf(trx, db, 'eu_users')
    .whereNull('display_username')
    .whereNotNull('username')
    .update({ display_username: trx.ref('username') });

  // Duplicates are moved aside first, so lower-casing can't make two rows collide
  const usernames = await groupsOf(trx, db, 'eu_users', 'username');
  const emails = await groupsOf(trx, db, 'eu_users', 'email');

  const renamedUsernames = await rewriteGroups(
    trx,
    db,
    'eu_users',
    'username',
    'username',
    usernames
  );
  const renamedEmails = await rewriteGroups(trx, db, 'eu_users', 'email', 'email', emails);

  const lowered = {
    usernames: await lowercase(trx, db, client, 'eu_users', 'username'),
    emails: await lowercase(trx, db, client, 'eu_users', 'email'),
  };

  return { renamedUsernames, renamedEmails, lowered };
};

const migrateRoles = async (trx: Knex, db: Database): Promise<number> =>
  rewriteGroups(trx, db, 'eu_roles', 'name', 'role', await groupsOf(trx, db, 'eu_roles', 'name'));

/** The join tables that hold a morph's type in a `related_type` column, from the metadata */
const morphTables = (db: Database): string[] => {
  const tables = new Set<string>();

  for (const meta of db.metadata.values()) {
    for (const attribute of Object.values(meta.attributes) as Array<Record<string, any>>) {
      if (
        attribute.type === 'relation' &&
        attribute.relation === 'morphToMany' &&
        attribute.joinTable?.morphColumn?.typeColumn?.name === 'related_type'
      ) {
        tables.add(String(attribute.joinTable.name));
      }
    }
  }

  return [...tables];
};

/** Media the user type held belongs to the profile now */
const retypeMedia = async (trx: Knex, db: Database): Promise<number> => {
  let retyped = 0;

  for (const table of morphTables(db)) {
    // eslint-disable-next-line no-await-in-loop
    if (await db.getSchemaConnection(trx).hasTable(table)) {
      // eslint-disable-next-line no-await-in-loop
      retyped += Number(
        await tableOf(trx, db, table)
          .where({ related_type: UP_USER_UID })
          .update({ related_type: PROFILE_UID })
      );
    }
  }

  return retyped;
};

/* -------------------------------------------------------------------------------------------------
 * The step
 * -----------------------------------------------------------------------------------------------*/

/**
 * The migration's first half, inside the start's internal migration and before the schema sync:
 * the record and the report, the renames, the staging, the lower-casing and de-duplication, the
 * media. Every part checks what is already done, so a start that stopped halfway (MySQL commits
 * each statement of DDL on its own) finishes on the next one. The record is written only while
 * this start still holds the claim.
 */
export const runPreSync: MigrationStepFn = async (trx, db, ctx) => {
  const { strapi } = ctx;
  const client = db.dialect.client as DbClient;

  const held = async (): Promise<MigrationRecord> => {
    const record = await readRecord(strapi);

    if (!record || record.claim?.by !== ctx.owner) {
      throw new Error(
        'This start no longer holds the migration: another start claimed it. Nothing more was written.'
      );
    }

    return record;
  };

  const write = async (patch: Partial<MigrationRecord>) => {
    await held();

    return updateRecord(strapi, patch);
  };

  let record = await held();

  // An attempt after a rollback starts over from the restored data
  const startOver = record.status === 'rolled-back' || record.attempt < ctx.attempt;

  if (startOver) {
    record = await write({
      status: 'in-progress',
      attempt: ctx.attempt,
      startedAt: ctx.now().toISOString(),
      cutoverAt: null,
      completedAt: null,
      rolledBackAt: null,
      cleanedUpAt: null,
      completedSteps: [],
      staged: {},
      carried: { defaultRoleDocumentId: null, copied: [] },
    });
  }

  if (record.completedSteps.includes('pre-sync')) {
    return;
  }

  // Once the tables have moved, the data this reads is gone: the report stays as it was
  const snapshot = await readUpSnapshot(trx, client);

  if (snapshot.tables.includes('up_users') || !(await readReport(strapi))) {
    await writeReport(strapi, buildReport(snapshot, reportContext(strapi, ctx, client)));
  }

  if (ctx.attempt > 1) {
    const emptied = await emptyProfileTables(trx, db, client);

    strapi.log.info(`${PLUGIN_ID}: emptied ${emptied} rows of the profile and account tables`);
  }

  await renameTables(trx, db, client, Object.entries(RENAMED), { keys: true });

  const upTables = await tablesStartingWith(trx, client, 'up_');
  const staging = await tablesStartingWith(trx, client, 'eu_stg_');
  const plan = planStaging(upTables, record.staged, staging);
  const staged = { ...record.staged, ...plan };

  // Recorded before the tables move, so a start that stops between the two still knows what is where
  if (Object.keys(plan).length > 0) {
    record = await write({ staged });
  }

  await renameTables(
    trx,
    db,
    client,
    Object.entries(staged).map(([stagedName, original]) => [original, stagedName]),
    { keys: false }
  );

  const users = await migrateUsers(trx, db, client);
  const roles = await migrateRoles(trx, db);
  const media = await retypeMedia(trx, db);

  strapi.log.info(
    `${PLUGIN_ID}: renamed ${Object.keys(RENAMED).length} tables and staged ${Object.keys(staged).length}; ` +
      `lower-cased ${users.lowered.usernames} usernames and ${users.lowered.emails} addresses; ` +
      `rewrote ${users.renamedUsernames} usernames, ${users.renamedEmails} addresses and ${roles} role names; ` +
      `re-typed ${media} media rows`
  );

  await write({
    cutoverAt: ctx.now().toISOString(),
    completedSteps: [...new Set([...record.completedSteps, 'pre-sync' as const])],
  });
};
