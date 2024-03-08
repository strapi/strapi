import { isEmpty } from 'lodash/fp';

import { getService } from '../utils';

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 */
const syncNonLocalizedAttributes = async (sourceEntry: any, model: any) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const nonLocalizedAttributes = copyNonLocalizedAttributes(model, entry);

  if (isEmpty(nonLocalizedAttributes)) {
    return;
  }

  const uid = model.uid;
  const documentId = sourceEntry.documentId;
  const status = sourceEntry?.publishedAt ? 'published' : 'draft';

  const localesToUpdate = (
    await strapi.db.query(uid).findMany({
      where: { documentId, publishedAt: status === 'published' ? { $ne: null } : null },
      select: ['locale'],
    })
  )
    .filter((entry: any) => sourceEntry.locale !== entry.locale)
    .map((entry: any) => entry.locale);

  // Update every other locale entry of this documentId in the same status
  // We need to support both statuses incase we are working with a content type
  // without draft and publish enabled
  return strapi.db.query(uid).updateMany({
    where: {
      documentId,
      publishedAt: status === 'published' ? { $ne: null } : null,
      locale: { $in: localesToUpdate },
    },
    data: nonLocalizedAttributes,
  });
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
