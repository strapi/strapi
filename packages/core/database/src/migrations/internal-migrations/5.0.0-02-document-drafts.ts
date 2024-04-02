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

// Consider draft and publish enabled if the publishedAt column exists
export const hasDraftAndPublish = async (knex: any, meta: Meta) => {
  const hasTable = await knex.schema.hasTable(meta.tableName);

  if (!hasTable) {
    return false;
  }

  // If the content type had draft and publish enabled (publishedAt column exists)
  // Then we need to create a draft counterpart for all the published entries
  if (!('publishedAt' in meta.attributes)) {
    return false;
  }

  return true;
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
      const hasDP = await hasDraftAndPublish(knex, meta);
      if (!hasDP) {
        continue;
      }

      // Extract all scalar attributes to use in the insert query
      const attributes = getScalarAttributes(meta);

      /**
       * INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
       * SELECT columnName1, columnName2, columnName3, ...
       * FROM tableName
       */
      await knex
        // INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
        .into(knex.raw(`${meta.tableName} (${attributes.join(', ')})`))
        .insert((subQb: typeof knex) => {
          // SELECT columnName1, columnName2, columnName3, ...
          subQb
            .select(
              ...attributes.map((att) => {
                // Override 'publishedAt' and 'updatedAt' attributes
                if (att === 'published_at') {
                  return knex.raw('NULL as published_at');
                }

                return att;
              })
            )
            .from(meta.tableName)
            // Only select entries that were published
            .whereNotNull('published_at');
          // TODO: Do not create draft if there is already a draft for the document
          // && NOT EXISTS (SELECT id from table as alias WHERE table.doc_id=alias.doc_id & alias.published_at IS NULL)
        });
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
