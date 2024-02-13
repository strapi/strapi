import { createId } from '@paralleldrive/cuid2';
import type { Knex } from 'knex';

import { Relation } from '../../types';
import type { Migration } from '../common';
import type { Database } from '../..';

const QUERIES = {
  postgres: `
    SELECT :tableName:.id as id, string_agg(DISTINCT :inverseJoinColumn:, ',') as otherIds
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE document_id IS NULL
    GROUP BY :joinColumn:
    LIMIT 1;
  `,
  mysql: `
    SELECT :tableName:.id as id, group_concat(DISTINCT :inverseJoinColumn:) as otherIds
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE document_id IS NULL
    GROUP BY :joinColumn:
    LIMIT 1;
  `,
  sqlite: `
    SELECT :tableName:.id as id, group_concat(DISTINCT :inverseJoinColumn:) as otherIds
    FROM :tableName:
    LEFT JOIN :joinTableName: ON :tableName:.id = :joinTableName:.:joinColumn:
    WHERE document_id IS NULL
    GROUP BY :joinColumn:
    LIMIT 1;
    `,
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
  const res = await knex.raw(QUERIES[db.dialect.client as keyof typeof QUERIES], {
    joinColumn,
    inverseJoinColumn,
    tableName,
    joinTableName,
  });

  if (res.length > 0) {
    const row = res[0];
    const otherIds = row.otherIds
      ? row.otherIds.split(',').map((v: string) => parseInt(v, 10))
      : [];

    return [row.id, ...otherIds];
  }

  return [];
};

export const createdDocumentId: Migration = {
  name: 'created-document-id',
  async up(knex, db) {
    // do sth
    for (const meta of db.metadata.values()) {
      if ('documentId' in meta.attributes) {
        // add column if doesn't exist
        const hasColumn = await knex.schema.hasColumn(meta.tableName, 'document_id');

        if (hasColumn) {
          continue;
        }

        await knex.schema.alterTable(meta.tableName, (table) => {
          table.string('document_id');
        });

        if ('localizations' in meta.attributes) {
          const { joinTable } = meta.attributes.localizations as Relation.ManyToMany;

          let ids: number[];

          do {
            ids = await getNextIdsToCreateDocumentId(db, knex, {
              joinColumn: joinTable.joinColumn.name,
              inverseJoinColumn: joinTable.inverseJoinColumn.name,
              tableName: meta.tableName,
              joinTableName: joinTable.name,
            });

            if (ids.length > 0) {
              await knex(meta.tableName).update({ document_id: createId() }).whereIn('id', ids);
            }
          } while (ids.length > 0);
        } else {
          // as long as one row doesn't have a document_id, we need to set it
          let res;
          do {
            res = await knex
              .select('id')
              .from(meta.tableName)
              .whereNull('document_id')
              .limit(1)
              .first();

            if (res) {
              await knex(meta.tableName).update({ document_id: createId() }).whereIn('id', res.id);
            }
          } while (res !== null);
        }
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
