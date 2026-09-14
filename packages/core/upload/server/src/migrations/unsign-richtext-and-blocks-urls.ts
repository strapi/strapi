import { isEqual } from 'lodash/fp';

import type { Database, Migration } from '@strapi/database';
import type { Struct } from '@strapi/types';

import {
  createSignCache,
  mapBlocksImages,
  mapRichtextUrls,
  stripSignedUrl,
  unsignImage,
} from '../services/extensions/utils';
import type { SignCache } from '../services/extensions/utils';

const BATCH_SIZE = 100;
const LOG_PREFIX = '[unsign-richtext-and-blocks-urls]';

type MigrationTrx = Parameters<Migration['up']>[0];

type TargetAttribute = { name: string; type: 'richtext' | 'blocks' };

type Progress = { scanned: number; updated: number };

const getTargetAttributes = (schema: Struct.Schema): TargetAttribute[] =>
  Object.entries(schema.attributes ?? {})
    .filter(([, attribute]) => attribute.type === 'richtext' || attribute.type === 'blocks')
    .map(([name, attribute]) => ({ name, type: attribute.type as TargetAttribute['type'] }));

const unsignValue = async (value: unknown, type: TargetAttribute['type'], cache: SignCache) => {
  return type === 'blocks'
    ? mapBlocksImages(value, (image) => unsignImage(image, cache))
    : mapRichtextUrls(value, (url) => stripSignedUrl(url, cache));
};

const migrateSchema = async (
  trx: MigrationTrx,
  db: Database,
  schema: Struct.Schema,
  cache: SignCache
): Promise<Progress> => {
  const progress: Progress = { scanned: 0, updated: 0 };
  const attributes = getTargetAttributes(schema);

  if (attributes.length === 0) {
    return progress;
  }

  const { uid } = schema;

  if (!db.metadata.has(uid)) {
    return progress;
  }

  const meta = db.metadata.get(uid);
  const { tableName } = meta;
  // The schema checks must run on the migration transaction: on SQLite the pool
  // has a single connection, so a root-connection query would wait on it forever
  const knex = db.getSchemaConnection(trx);

  // On a fresh project the migrations run before the tables exist
  if (!(await knex.hasTable(tableName))) {
    return progress;
  }

  // Internal migrations run before the schema sync: an attribute added in the
  // same deploy as this version has no column yet, so only select what exists
  const existing: TargetAttribute[] = [];

  for (const attribute of attributes) {
    const attributeMeta = meta.attributes[attribute.name];
    const columnName =
      attributeMeta && 'columnName' in attributeMeta && attributeMeta.columnName
        ? attributeMeta.columnName
        : attribute.name;

    if (await knex.hasColumn(tableName, columnName)) {
      existing.push(attribute);
    }
  }

  if (existing.length === 0) {
    return progress;
  }

  const select = ['id', ...existing.map(({ name }) => name)];

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const rows: Record<string, any>[] = await strapi.db.query(uid).findMany({
      select,
      limit: BATCH_SIZE,
      offset,
      orderBy: { id: 'asc' },
    });

    hasMore = rows.length === BATCH_SIZE;
    offset += rows.length;
    progress.scanned += rows.length;

    for (const row of rows) {
      const data: Record<string, unknown> = {};

      for (const { name, type } of existing) {
        // A value the mapper cannot process is logged and skipped. This is safe
        // to catch: the mapper does no database work (presigning is local to
        // the provider), so the surrounding transaction is not poisoned.
        try {
          const unsigned = await unsignValue(row[name], type, cache);

          if (!isEqual(unsigned, row[name])) {
            data[name] = unsigned;
          }
        } catch (error) {
          strapi.log.warn(
            `${LOG_PREFIX} Skipped ${uid}.${name} on row ${row.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      if (Object.keys(data).length > 0) {
        await strapi.db.query(uid).update({ where: { id: row.id }, data });
        progress.updated += 1;
      }
    }
  }

  if (progress.scanned > 0) {
    strapi.log.info(
      `${LOG_PREFIX} ${uid}: ${progress.scanned} rows scanned, ${progress.updated} updated`
    );
  }

  return progress;
};

const migrateUp = async (trx: MigrationTrx, db: Database) => {
  const { provider } = strapi.plugins.upload;

  // Nothing is signed on a public provider, so there is nothing to strip
  if (!provider || !(await provider.isPrivate())) {
    return;
  }

  const schemas = [
    ...Object.values(strapi.contentTypes),
    ...Object.values(strapi.components),
  ] as Struct.Schema[];

  // One presign per distinct URL for the whole run, however many rows it appears in
  const cache = createSignCache();
  const total: Progress = { scanned: 0, updated: 0 };

  for (const schema of schemas) {
    const progress = await migrateSchema(trx, db, schema, cache);

    total.scanned += progress.scanned;
    total.updated += progress.updated;
  }

  strapi.log.info(`${LOG_PREFIX} Done: ${total.scanned} rows scanned, ${total.updated} updated`);
};

/**
 * Richtext and blocks attributes embed the file URL in their own value, so a
 * signed URL written by the admin used to be frozen in the row and broke as
 * soon as the signature expired. New writes are normalised by the upload
 * document service middleware, and the read path re-signs a stored URL that
 * still carries a stale signature, so this migration is a cleanup of the rows
 * written before the fix rather than a prerequisite for it.
 *
 * Idempotent: re-running it finds nothing left to change.
 *
 * Runs inside the internal migration transaction like every other internal
 * migration: a database error fails the boot. A single value the mapper cannot
 * process is logged with a warning and skipped; it is normalised by the
 * middleware on its next save and re-signed on read until then.
 */
export const unsignRichtextAndBlocksUrls: Migration = {
  name: 'upload::unsign-richtext-and-blocks-urls',
  async up(trx, db) {
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
