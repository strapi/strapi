import { isEmpty } from 'lodash/fp';

import { mapAsync } from '@strapi/utils';
import { getService } from '../utils';

/**
 * Update non localized fields of all the related localizations of an entry with the entry values
 * @param {Object} entry entry to update
 * @param {Object} options
 * @param {Object} options.model corresponding model
 */
const syncNonLocalizedAttributes = async (entry: any, model: any) => {
  const { copyNonLocalizedAttributes } = getService('content-types');

  const nonLocalizedAttributes = copyNonLocalizedAttributes(model, entry);

  if (isEmpty(nonLocalizedAttributes)) {
    return;
  }

  const uid = model.uid;
  const documentId = entry.documentId;
  const locale = entry.locale;

  // Update every other entry of this documentId across all locales

  // Find all the other locales for the draft status of this document
  const otherLocaleEntries = await strapi.documents(uid).findMany({
    status: 'draft',
    fields: ['locale'],
    filters: {
      $and: [
        {
          documentId: {
            $eq: documentId,
          },
        },
        { locale: { $ne: locale } },
      ],
    },
  });

  await mapAsync(otherLocaleEntries, (otherEntry: any) => {
    return strapi
      .documents(uid)
      .update(documentId, { data: nonLocalizedAttributes, where: { locale: otherEntry.locale } });
  });
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
