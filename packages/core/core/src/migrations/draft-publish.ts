import { contentTypes as contentTypesUtils } from '@strapi/utils';
import { Schema } from '@strapi/types';

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

/**
 * Enable draft and publish for content types.
 *
 * Draft and publish disabled content types will have their entries published,
 * this migration clones those entries as drafts.
 *
 * TODO: Clone components, dynamic zones and relations
 */
const enableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  // run the after content types migrations

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if d&p was enabled set publishedAt to eq createdAt
    if (
      !contentTypesUtils.hasDraftAndPublish(oldContentType) &&
      contentTypesUtils.hasDraftAndPublish(contentType)
    ) {
      const metadata = strapi.db.metadata.get(uid);

      // Extract all scalar attributes to use in the insert query
      const attributes = Object.values(metadata.attributes).reduce((acc, attribute: any) => {
        if (['id'].includes(attribute.columnName)) {
          return acc;
        }

        if (contentTypesUtils.isScalarAttribute(attribute)) {
          acc.push(attribute.columnName);
        }

        return acc;
      }, [] as string[]);

      /**
       * INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
       * SELECT columnName1, columnName2, columnName3, ...
       * FROM tableName
       */
      const qb = strapi.db?.getConnection();
      await qb
        // INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
        .into(qb.raw(`${metadata.tableName} (${attributes.join(', ')})`))
        .insert((subQb: typeof qb) => {
          // SELECT columnName1, columnName2, columnName3, ...
          subQb
            .select(
              ...attributes.map((att) => {
                // Override 'publishedAt' and 'updatedAt' attributes
                if (att === 'published_at') {
                  return qb.raw('NULL as published_at');
                }

                // TODO: Find a way to insert a date using the correct format
                //           Before: 1710240975246
                // With qb.fn.now(): 2021-10-24 09:52:46
                if (att === 'updated_at') {
                  return qb.raw(`?? as updated_at`, [qb.fn.now()]);
                }

                return att;
              })
            )
            .from(metadata.tableName)
            .whereNotNull('published_at');
        });
    }
  }
};

const disableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if d&p was disabled remove unpublish content before sync
    if (
      contentTypesUtils.hasDraftAndPublish(oldContentType) &&
      !contentTypesUtils.hasDraftAndPublish(contentType)
    ) {
      await strapi.db?.queryBuilder(uid).delete().where({ published_at: null }).execute();
    }
  }
};

export { enableDraftAndPublish as enable, disableDraftAndPublish as disable };
