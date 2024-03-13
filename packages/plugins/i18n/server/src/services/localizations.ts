import { isEmpty } from 'lodash/fp';

import { getService } from '../utils';

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 */
const syncNonLocalizedAttributes = async (sourceEntry: any, model: any) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const nonLocalizedAttributes = copyNonLocalizedAttributes(model, sourceEntry);
  if (isEmpty(nonLocalizedAttributes)) {
    return;
  }

  const uid = model.uid;
  const documentId = sourceEntry.documentId;
  const status = sourceEntry?.publishedAt ? 'published' : 'draft';

  // Find all the entries that need to be updated
  // Every other entry of the document in the same status but a different locale
  const entriesToUpdate = await strapi.db.query(uid).findMany({
    where: {
      documentId,
      publishedAt: status === 'published' ? { $ne: null } : null,
      locale: { $ne: sourceEntry.locale },
    },
    select: ['locale', 'id'],
  });

  for (const entry of entriesToUpdate) {
    await strapi.documents(uid).updateComponents(uid, entry, nonLocalizedAttributes as any);
  }
  const entryData = await strapi.documents(uid).omitComponentData(model, nonLocalizedAttributes);

  // Update every other locale entry of this documentId in the same status
  // We need to support both statuses incase we are working with a content type
  // without draft and publish enabled
  await strapi.db.query(uid).updateMany({
    where: {
      documentId,
      publishedAt: status === 'published' ? { $ne: null } : null,
      locale: { $in: entriesToUpdate.map((entry) => entry.locale) },
    },
    data: entryData,
  });
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
