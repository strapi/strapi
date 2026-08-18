/**
 * NOTE: This migration avoids using the `identifiers` utility.
 * As the `5.0.0-01-convert-identifiers-long-than-max-length`
 * migration does not convert the `localizations` join tables, as they are not
 * tables that exist anymore in v5 and are not in the db metadata.
 *
 * This migration therefore relies on the fact that those tables still exist, and
 * references them directly.
 *
 * Database join table name: `categories_localizations_links`
 * Actual `identifiers` returned join table name: `categories_localizations_lnk`
 *
 */
import { createId } from '@paralleldrive/cuid2';
import { snakeCase } from 'lodash/fp';
import type { Knex } from 'knex';

import type { Migration } from '../common';
import { createHeartbeatLogger, type HeartbeatLogger } from '../heartbeat';
import type { Database } from '../..';
import type { Meta } from '../../metadata';

function getBatchSize(trx: Knex, defaultSize: number = 1000): number {
  const client = trx.client.config.client;
  const isSQLite =
    typeof client === 'string' && ['sqlite', 'sqlite3', 'better-sqlite3'].includes(client);
  return isSQLite ? Math.min(defaultSize, 250) : defaultSize;
}

// Union-find (disjoint-set) helpers used to cluster localization-linked rows in memory.
// Path-compressing `find` keeps repeated lookups close to O(1) amortized.
const find = (parent: Map<number, number>, start: number): number => {
  let current = start;
  while (parent.get(current) !== current) {
    parent.set(current, parent.get(parent.get(current) as number) as number);
    current = parent.get(current) as number;
  }
  return current;
};

const union = (parent: Map<number, number>, a: number, b: number): void => {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA !== rootB) {
    parent.set(rootA, rootB);
  }
};

// Migrate document ids for tables that have localizations
//
// This clusters rows in memory (via union-find) instead of discovering one cluster at a
// time through a `LIMIT 1` query. The previous implementation re-ran a query that scans
// the whole table (filtered by `document_id IS NULL`, a column with no index at this point
// in the migration) once per cluster, which is roughly O(n) discovery queries each doing
// an O(n) scan — effectively O(n^2) for a table with n rows. For tables with many rows
// and/or many locales this could take hours or longer without making visible progress.
// See https://github.com/strapi/strapi/issues/23812, 23517, 25231.
//
// This also fixes a correctness gap: the original query only follows *direct* links
// (one hop), so a chain of locale links (A<->B, B<->C, but no direct A<->C row) could be
// split across two document ids instead of clustered together. Union-find naturally
// follows transitive links. See https://github.com/strapi/strapi/issues/20948, 24544.
const migrateDocumentIdsWithLocalizations = async (
  db: Database,
  knex: Knex,
  meta: Meta,
  heartbeat: HeartbeatLogger
) => {
  const singularName = meta.singularName.toLowerCase();
  const joinColumn = snakeCase(`${singularName}_id`);
  const inverseJoinColumn = snakeCase(`inv_${singularName}_id`);
  const joinTableName = snakeCase(`${meta.tableName}_localizations_links`);
  const batchSize = getBatchSize(knex);

  const pendingIds: number[] = (
    await knex(meta.tableName).select('id').whereNull('document_id')
  ).map((row: { id: number }) => row.id);

  if (pendingIds.length === 0) {
    return;
  }

  const pendingIdSet = new Set(pendingIds);

  // Fetch every relevant link in batches — passing all ids in a single `whereIn` can
  // exceed the database driver's bound-parameter limit on large tables.
  const links: Array<Record<string, number>> = [];
  for (let i = 0; i < pendingIds.length; i += batchSize) {
    const idChunk = pendingIds.slice(i, i + batchSize);
    const chunkLinks = await knex(joinTableName)
      .select(joinColumn, inverseJoinColumn)
      .whereIn(joinColumn, idChunk);
    links.push(...chunkLinks);
  }

  const parent = new Map<number, number>();
  for (const id of pendingIds) {
    parent.set(id, id);
  }
  for (const link of links) {
    const a = link[joinColumn];
    const b = link[inverseJoinColumn];
    if (pendingIdSet.has(a) && pendingIdSet.has(b)) {
      union(parent, a, b);
    }
  }

  const clusters = new Map<number, number[]>();
  for (const id of pendingIds) {
    const root = find(parent, id);
    const cluster = clusters.get(root);
    if (cluster) {
      cluster.push(id);
    } else {
      clusters.set(root, [id]);
    }
  }

  const updates: Array<{ id: number; documentId: string }> = [];
  for (const ids of clusters.values()) {
    const documentId = createId();
    for (const id of ids) {
      updates.push({ id, documentId });
    }
  }

  let processed = 0;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ id, documentId }) =>
        knex(meta.tableName).where('id', id).update({ document_id: documentId })
      )
    );
    processed += batch.length;
    const rowsProcessed = processed;
    heartbeat.tick(
      (elapsedSeconds) =>
        `[document-id] still running (${elapsedSeconds}s) · ${meta.tableName} ${rowsProcessed}/${updates.length} rows processed`
    );
  }
};

// Migrate document ids for tables that don't have localizations
const migrationDocumentIds = async (
  db: Database,
  knex: Knex,
  meta: Meta,
  heartbeat: HeartbeatLogger
) => {
  const batchSize = getBatchSize(knex);
  const total = +(await knex(meta.tableName).count('* as recordsLeft').whereNull('document_id'))[0]
    .recordsLeft;
  let recordsLeft = total;
  while (recordsLeft > 0) {
    const currentBatchSize = recordsLeft < batchSize ? recordsLeft : batchSize;
    const updateRecords = (
      await knex(meta.tableName).select('id').whereNull('document_id').limit(currentBatchSize)
    ).map((item) => ({ id: item.id, document_id: createId() }));
    await knex(meta.tableName).insert(updateRecords).onConflict('id').merge();
    recordsLeft -= updateRecords.length;
    const processed = total - recordsLeft;
    heartbeat.tick(
      (elapsedSeconds) =>
        `[document-id] still running (${elapsedSeconds}s) · ${meta.tableName} ${processed}/${total}`
    );
  }
};

const isDuplicateColumnError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; errno?: number; message?: string };
  if (e.code === '42701') return true;
  if (e.errno === 1060) return true;
  if (typeof e.message === 'string' && /duplicate column/i.test(e.message)) return true;
  return false;
};

const createDocumentIdColumn = async (knex: Knex, tableName: string) => {
  try {
    await knex.schema.alterTable(tableName, (table) => {
      table.string('document_id');
    });
  } catch (error) {
    if (!isDuplicateColumnError(error)) {
      throw error;
    }
  }
};

const hasLocalizationsJoinTable = async (knex: Knex, tableName: string) => {
  const joinTableName = snakeCase(`${tableName}_localizations_links`);
  return knex.schema.hasTable(joinTableName);
};

export const createdDocumentId: Migration = {
  name: '5.0.0-02-created-document-id',
  async up(knex, db) {
    const heartbeat = createHeartbeatLogger((message) => {
      db.logger.info(message);
    });

    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);

      if (!hasTable) {
        continue;
      }

      if ('documentId' in meta.attributes) {
        const hasDocumentIdColumn = await knex.schema.hasColumn(meta.tableName, 'document_id');

        if (!hasDocumentIdColumn) {
          await createDocumentIdColumn(knex, meta.tableName);
        }

        if (await hasLocalizationsJoinTable(knex, meta.tableName)) {
          await migrateDocumentIdsWithLocalizations(db, knex, meta, heartbeat);
        } else {
          await migrationDocumentIds(db, knex, meta, heartbeat);
        }
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
