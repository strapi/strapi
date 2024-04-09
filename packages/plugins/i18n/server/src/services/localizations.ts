import { cloneDeep, isEmpty } from 'lodash/fp';

import { type Schema } from '@strapi/types';
import { async } from '@strapi/utils';
import { getService } from '../utils';

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 */
const syncNonLocalizedAttributes = async (sourceEntry: any, model: Schema.ContentType) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const nonLocalizedAttributes = copyNonLocalizedAttributes(model, sourceEntry);
  if (isEmpty(nonLocalizedAttributes)) {
    return;
  }

  const uid = model.uid;
  const documentId = sourceEntry.documentId;
  const locale = sourceEntry.locale;
  const status = sourceEntry?.publishedAt ? 'published' : 'draft';

  // Find all the entries that need to be updated
  // this is every other entry of the document in the same status but a different locale
  const localeEntriesToUpdate = await strapi.db.query(uid).findMany({
    where: {
      documentId,
      publishedAt: status === 'published' ? { $ne: null } : null,
      locale: { $ne: locale },
    },
    select: ['locale', 'id'],
  });

  const entryData = await strapi.documents(uid).omitComponentData(nonLocalizedAttributes);

  await async.map(localeEntriesToUpdate, async (entry: any) => {
    const transformedData = await strapi.documents.utils.transformData(
      cloneDeep(nonLocalizedAttributes),
      {
        uid,
        status,
        locale: entry.locale,
        allowMissingId: true,
      }
    );

    // Update or create non localized components for the entry
    const componentData = await strapi
      .documents(uid)
      .updateComponents(entry, transformedData as any);

    // Update every other locale entry of this documentId in the same status
    await strapi.db.query(uid).update({
      where: {
        documentId,
        publishedAt: status === 'published' ? { $ne: null } : null,
        locale: { $eq: entry.locale },
      },
      // The data we send to the update function is the entry data merged with
      // the updated component data
      data: Object.assign(cloneDeep(entryData), componentData),
    });
  });
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
