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
import type { Database } from '../..';
import type { Meta } from '../../metadata';
import { transformLogMessage } from '../logger';

interface Params {
  joinColumn: string;
  inverseJoinColumn: string;
  tableName: string;
  joinTableName: string;
}

const migrationScriptId = '5.0.0-02-created-document-id';
const QUERIES = {
  async postgres(knex: Knex, params: Params) {
    const res = await knex.raw(
      `
    SELECT :tableName:.id as id, string_agg(DISTINCT :inverseJoinColumn:::character varying, ',') as other_ids
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE :tableName:.document_id IS NULL
    GROUP BY :tableName:.id, :joinTableName:.:joinColumn:
    LIMIT 100;
  `,
      params
    );

    return res.rows;
  },
  async mysql(knex: Knex, params: Params) {
    const [res] = await knex.raw(
      `
    SELECT :tableName:.id as id, group_concat(DISTINCT :inverseJoinColumn:) as other_ids
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE :tableName:.document_id IS NULL
    GROUP BY :tableName:.id, :joinTableName:.:joinColumn:
    LIMIT 100;
  `,
      params
    );

    return res;
  },
  async sqlite(knex: Knex, params: Params) {
    return knex.raw(
      `
    SELECT :tableName:.id as id, group_concat(DISTINCT :inverseJoinColumn:) as other_ids
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE :tableName:.document_id IS NULL
    GROUP BY :joinTableName:.:joinColumn:
    LIMIT 100;
    `,
      params
    );
  },
};

const getNextIdsToCreateDocumentId = async (
  db: Database,
  knex: Knex,
  {
    joinColumn,
    inverseJoinColumn,
    tableName,
    joinTableName,
  }: {
    joinColumn: string;
    inverseJoinColumn: string;
    tableName: string;
    joinTableName: string;
  }
): Promise<number[]> => {
  const res = await QUERIES[db.dialect.client as keyof typeof QUERIES](knex, {
    joinColumn,
    inverseJoinColumn,
    tableName,
    joinTableName,
  });

  if (res.length > 0) {
    const allIds: number[] = [];
    
    // Process all rows returned by the query
    for (const row of res) {
      const otherIds = row.other_ids
        ? row.other_ids.split(',').map((v: string) => parseInt(v, 10))
        : [];
      
      allIds.push(row.id, ...otherIds);
    }

    return allIds;
  }

  return [];
};

// Migrate document ids for tables that have localizations
const migrateDocumentIdsWithLocalizations = async (db: Database, knex: Knex, meta: Meta) => {
  const singularName = meta.singularName.toLowerCase();
  const joinColumn = snakeCase(`${singularName}_id`);
  const inverseJoinColumn = snakeCase(`inv_${singularName}_id`);
  let ids: number[];

  let totalCount = 0;

  do {
    ids = await getNextIdsToCreateDocumentId(db, knex, {
      joinColumn,
      inverseJoinColumn,
      tableName: meta.tableName,
      joinTableName: snakeCase(`${meta.tableName}_localizations_links`),
    });

    if (ids.length > 0) {
      totalCount += ids.length;
      // Generate a unique document ID for all related records
      const documentId = createId();

      db.logger.info(transformLogMessage('info', `${migrationScriptId} - Updating document_id for ${ids.length} records in ${meta.tableName} (total: ${totalCount})`));
      
      // Apply the same document ID to all related records to maintain the localization relationship
      await knex(meta.tableName).update({ document_id: documentId }).whereIn('id', ids);
    }
  } while (ids.length > 0);
};

// Migrate document ids for tables that don't have localizations
const migrationDocumentIds = async (db: Database, knex: Knex, meta: Meta) => {
  let idsToUpdate: { id: number }[];
  let totalCount = 0;
  do {
    idsToUpdate = await knex(meta.tableName)
      .select('id')
      .whereNull('document_id')
      .limit(100);
      
    if (idsToUpdate.length > 0) {
      totalCount += idsToUpdate.length;
      // Process each record individually to ensure unique document IDs
      const updates = idsToUpdate.map(({ id }) => ({
        id,
        document_id: createId()
      }));
      
      await knex.transaction(async (trx) => {
        const chunkedUpdates = [];
        for (const update of updates) {
          chunkedUpdates.push(
            trx(meta.tableName)
              .where('id', update.id)
              .update({ document_id: update.document_id })
          );
        }
        await Promise.all(chunkedUpdates);
      });

      db.logger.info(transformLogMessage('info', `${migrationScriptId} - Updating document_id for ${idsToUpdate.length} records in table ${meta.tableName} (total: ${totalCount})`));
    }
  } while (idsToUpdate.length > 0);
};

const createDocumentIdColumn = async (knex: Knex, tableName: string) => {
  await knex.schema.alterTable(tableName, (table) => {
    table.string('document_id');
  });
};

const hasLocalizationsJoinTable = async (knex: Knex, tableName: string) => {
  const joinTableName = snakeCase(`${tableName}_localizations_links`);
  return knex.schema.hasTable(joinTableName);
};

export const createdDocumentId: Migration = {
  name: migrationScriptId,
  async up(knex, db) {
    db.logger.info(transformLogMessage('info', `Migration ${migrationScriptId} running`));
    // do sth
    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);

      if (!hasTable) {
        continue;
      }

      if ('documentId' in meta.attributes) {
        // add column if doesn't exist
        const hasDocumentIdColumn = await knex.schema.hasColumn(meta.tableName, 'document_id');

        if (hasDocumentIdColumn) {
          continue;
        }

        db.logger.info(transformLogMessage('info', `${migrationScriptId} - Adding document_id column to ${meta.tableName}`));

        await createDocumentIdColumn(knex, meta.tableName);

        if (await hasLocalizationsJoinTable(knex, meta.tableName)) {
          await migrateDocumentIdsWithLocalizations(db, knex, meta);
        } else {
          await migrationDocumentIds(db, knex, meta);
        }
      }
    }
    db.logger.info(transformLogMessage('info', `Migration ${migrationScriptId} completed`));
  },
  async down() {
    throw new Error('not implemented');
  },
};
