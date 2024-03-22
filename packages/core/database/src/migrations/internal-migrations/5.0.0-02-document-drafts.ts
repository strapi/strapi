import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { Meta } from '../../metadata';
import type { Migration } from '../common';

const getScalarAttributes = (metadata: Meta) => {
  return Object.values(metadata.attributes).reduce((acc, attribute: any) => {
    if (['id'].includes(attribute.columnName)) {
      return acc;
    }

    if (contentTypesUtils.isScalarAttribute(attribute)) {
      acc.push(attribute.columnName);
    }

    return acc;
  }, [] as string[]);
};

/**
 * On V4 there was no concept of document, and an entry could be in a draft or published state.
 * But not both at the same time.
 *
 * On V5 we introduced the concept of document, and an entry can be in a draft or published state,
 * with the requirement that a document must always have a draft.
 *
 * This migration creates the document draft counterpart for all the entries that were in a published state.
 *
 */
export const createDocumentDrafts: Migration = {
  name: 'created-document-drafts',
  async up(knex, db) {
    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);

      if (!hasTable) {
        continue;
      }

      // If the content type had draft and publish enabled (publishedAt column exists)
      // Then we need to create a draft counterpart for all the published entries
      if (!('publishedAt' in meta.attributes)) {
        continue;
      }

      // Extract all scalar attributes to use in the insert query
      const attributes = getScalarAttributes(meta);

      /**
       * INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
       * SELECT columnName1, columnName2, columnName3, ...
       * FROM tableName
       */
      const qb = db?.getConnection();
      await qb
        // INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
        .into(qb.raw(`${meta.tableName} (${attributes.join(', ')})`))
        .insert((subQb: typeof qb) => {
          // SELECT columnName1, columnName2, columnName3, ...
          subQb
            .select(
              ...attributes.map((att) => {
                // Override 'publishedAt' and 'updatedAt' attributes
                if (att === 'published_at') {
                  return qb.raw('NULL as published_at');
                }

                if (att === 'updated_at') {
                  return qb.raw(`? as updated_at`, [new Date()]);
                }

                return att;
              })
            )
            .from(meta.tableName)
            // Only select entries that were published
            .whereNotNull('published_at');
        });
    }
  },
  async down() {
    // no-op
  },
};
