// knex is Strapi's own database layer (hoisted); only its types are used here
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import type { Knex } from 'knex';
import type { Database } from '@strapi/database';

import type { DbClient } from './snapshot';

type Row = Record<string, unknown>;

/** The table, in the schema the project's database is configured with */
export const tableOf = (trx: Knex, db: Database, table: string) => {
  const schema = db.getSchemaName();

  return schema ? trx(table).withSchema(schema) : trx(table);
};

/** The table's name as a statement writes it: with its schema, when there is one */
export const qualified = (db: Database, table: string): string => {
  const schema = db.getSchemaName();

  return schema ? `${schema}.${table}` : table;
};

export const hasTable = (trx: Knex, db: Database, name: string): Promise<boolean> =>
  db.getSchemaConnection(trx).hasTable(name);

export const columnsOf = async (trx: Knex, db: Database, table: string): Promise<string[]> =>
  Object.keys((await tableOf(trx, db, table).columnInfo()) as object);

/** Drops a table; on Postgres with the keys that point at it, which a later step re-creates */
export const dropTable = async (trx: Knex, db: Database, client: DbClient, name: string) => {
  if (client === 'postgres') {
    await trx.raw('drop table if exists ?? cascade', [qualified(db, name)]);
  } else {
    await db.getSchemaConnection(trx).dropTableIfExists(name);
  }
};

/** The indexes of `table` that cover `column` and that SQLite lets go (not those a constraint made) */
const sqliteIndexesOn = async (trx: Knex, table: string, column: string): Promise<string[]> => {
  const indexes = (await trx.raw('pragma index_list(??)', [table])) as Row[];
  const names: string[] = [];

  for (const index of indexes) {
    if (index.origin === 'c') {
      // eslint-disable-next-line no-await-in-loop
      const columns = (await trx.raw('pragma index_info(??)', [String(index.name)])) as Row[];

      if (columns.some((entry) => entry.name === column)) {
        names.push(String(index.name));
      }
    }
  }

  return names;
};

/**
 * Drops a column with `ALTER TABLE ... DROP COLUMN`. Never knex's `dropColumn`, which on SQLite
 * rebuilds the table and, inside a transaction, takes the rows of the tables that point at it.
 */
export const dropColumn = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  table: string,
  column: string
) => {
  if (client === 'sqlite') {
    for (const index of await sqliteIndexesOn(trx, table, column)) {
      // eslint-disable-next-line no-await-in-loop
      await trx.raw('drop index ??', [index]);
    }
  }

  await trx.raw('alter table ?? drop column ??', [qualified(db, table), column]);
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
 * Brings the indexes, keys and constraints of `to` that still carry `from`'s name in line with the
 * new one: renamed where the database can (Postgres), dropped where it can't (the schema sync
 * builds them again). SQLite keeps index names for the whole database, so one left under the old
 * name would stop the table that takes it from being built again. Names for which `dropped`
 * answers true are dropped on every database.
 */
export const moveSchemaObjects = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  from: string,
  to: string,
  dropped: (name: string) => boolean = () => false
) => {
  const prefix = `${from}_`;
  const names = (await schemaObjectNames(trx, client, to)).filter((name) =>
    name.startsWith(prefix)
  );

  for (const name of new Set(names)) {
    if (dropped(name)) {
      if (client === 'postgres') {
        // eslint-disable-next-line no-await-in-loop
        await trx.raw('alter table ?? drop constraint if exists ??', [qualified(db, to), name]);
        // eslint-disable-next-line no-await-in-loop
        await trx.raw('drop index if exists ??', [name]);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await db.dialect.dropSchemaObject(trx, { table: to, name });
      }
    } else if (db.dialect.canRenameSchemaObjects()) {
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

/** Postgres keeps a table's id sequence under its old name after a rename: it follows the table */
export const moveSequence = async (trx: Knex, db: Database, from: string, to: string) => {
  const sequence = `select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and c.relname = ? and n.nspname = current_schema()`;
  const has = async (name: string) =>
    ((await trx.raw(sequence, [name])) as { rows: Row[] }).rows.length > 0;

  if ((await has(`${from}_id_seq`)) && !(await has(`${to}_id_seq`))) {
    await trx.raw('ALTER SEQUENCE ?? RENAME TO ??', [
      qualified(db, `${from}_id_seq`),
      `${to}_id_seq`,
    ]);
  }
};

/**
 * Renames a table and what carries its name. A table that an earlier run already moved is left as
 * it is; a target that exists, or a source that is gone, stops the run before anything is lost.
 */
export const renameBack = async (
  trx: Knex,
  db: Database,
  client: DbClient,
  from: string,
  to: string,
  dropped?: (name: string) => boolean
) => {
  const hasFrom = await hasTable(trx, db, from);
  const hasTo = await hasTable(trx, db, to);

  if (!hasFrom && hasTo) {
    return;
  }

  if (!hasFrom || hasTo) {
    throw new Error(
      hasFrom
        ? `The table ${to} already exists, so ${from} was not renamed. Nothing was recorded.`
        : `The table ${from} is missing, so it cannot become ${to}. Nothing was recorded.`
    );
  }

  if (!(await db.schema.renameTable(trx, { from, to }))) {
    throw new Error(`The table ${from} was not renamed to ${to}. Nothing was recorded.`);
  }

  await moveSchemaObjects(trx, db, client, from, to, dropped);

  if (client === 'postgres') {
    await moveSequence(trx, db, from, to);
  }
};
