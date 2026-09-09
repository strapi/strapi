import { isEqual } from 'lodash/fp';

import type { Database, Migration } from '@strapi/database';
import type { Struct } from '@strapi/types';

import {
  mapBlocksImages,
  mapRichtextUrls,
  stripSignedUrl,
  unsignImage,
} from '../services/extensions/utils';

const BATCH_SIZE = 100;

type TargetAttribute = { name: string; type: 'richtext' | 'blocks' };

const getTargetAttributes = (schema: Struct.Schema): TargetAttribute[] =>
  Object.entries(schema.attributes ?? {})
    .filter(([, attribute]) => attribute.type === 'richtext' || attribute.type === 'blocks')
    .map(([name, attribute]) => ({ name, type: attribute.type as TargetAttribute['type'] }));

const unsignValue = async (value: unknown, type: TargetAttribute['type']) => {
  return type === 'blocks'
    ? mapBlocksImages(value, unsignImage)
    : mapRichtextUrls(value, stripSignedUrl);
};

const migrateSchema = async (db: Database, schema: Struct.Schema) => {
  const attributes = getTargetAttributes(schema);

  if (attributes.length === 0) {
    return;
  }

  const { uid } = schema;

  if (!db.metadata.has(uid)) {
    return;
  }

  const meta = db.metadata.get(uid);
  const { tableName } = meta;
  const knex = db.getSchemaConnection();

  // On a fresh project the migrations run before the tables exist
  if (!(await knex.hasTable(tableName))) {
    return;
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
    return;
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

    for (const row of rows) {
      const data: Record<string, unknown> = {};

      for (const { name, type } of existing) {
        // A single malformed value must not abort the whole migration
        try {
          const unsigned = await unsignValue(row[name], type);

          if (!isEqual(unsigned, row[name])) {
            data[name] = unsigned;
          }
        } catch (error) {
          strapi.log.warn(
            `[unsign-richtext-and-blocks-urls] Skipped ${uid}.${name} on row ${row.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      if (Object.keys(data).length > 0) {
        await strapi.db.query(uid).update({ where: { id: row.id }, data });
      }
    }
  }
};

const migrateUp = async (db: Database) => {
  const { provider } = strapi.plugins.upload;

  // Nothing is signed on a public provider, so there is nothing to strip
  if (!provider || !(await provider.isPrivate())) {
    return;
  }

  const schemas = [
    ...Object.values(strapi.contentTypes),
    ...Object.values(strapi.components),
  ] as Struct.Schema[];

  for (const schema of schemas) {
    // One bad table must never block boot: warn, leave it, move on
    try {
      await migrateSchema(db, schema);
    } catch (error) {
      strapi.log.warn(
        `[unsign-richtext-and-blocks-urls] Skipped ${schema.uid}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

/**
 * Richtext and blocks attributes embed the file URL in their own value, so a
 * signed URL written by the admin used to be frozen in the row and broke as
 * soon as the signature expired. New writes are normalised by the upload
 * document service middleware; this rewrites the rows written before that.
 *
 * Idempotent: re-running it finds nothing left to change.
 *
 * A schema or a value that cannot be processed is logged with a warning and
 * skipped rather than aborting the boot. The migration runs once, so the
 * affected rows are left signed; they are normalised by the middleware on their
 * next save, and re-signed on read until then.
 */
export const unsignRichtextAndBlocksUrls: Migration = {
  name: 'upload::unsign-richtext-and-blocks-urls',
  async up(_trx, db) {
    await migrateUp(db);
  },
  async down() {
    throw new Error('not implemented');
  },
};
