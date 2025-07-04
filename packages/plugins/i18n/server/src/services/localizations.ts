import { cloneDeep, isEmpty } from 'lodash/fp';

import type { Schema } from '@strapi/types';
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

  // Fetch all fields needed for comparison and component update
  const selectFields = ['locale', 'id', ...Object.keys(nonLocalizedAttributes)];
  const localeEntriesToUpdate = await strapi.db.query(uid).findMany({
    where: {
      documentId,
      publishedAt: status === 'published' ? { $ne: null } : null,
      locale: { $ne: locale },
    },
    select: selectFields,
  });

  // Only update entries that have real changes
  const entriesToActuallyUpdate = localeEntriesToUpdate.filter((entry: any) =>
    Object.keys(nonLocalizedAttributes).some((key) => entry[key] !== nonLocalizedAttributes[key])
  );

  if (!entriesToActuallyUpdate.length) return;

  // Prepare the main data for update (excluding components)
  const entryData = await strapi.documents(uid).omitComponentData(nonLocalizedAttributes);

  await async.map(entriesToActuallyUpdate, async (entry: any) => {
    // Prepare transformed data for this entry
    const transformedData = await strapi.documents.utils.transformData(
      cloneDeep(nonLocalizedAttributes),
      {
        uid,
        status,
        locale: entry.locale,
        allowMissingId: true,
      }
    );

    // Update or create non-localized components for the entry
    const componentData = await strapi
      .documents(uid)
      .updateComponents(entry, transformedData as any);

    // Update the entry with merged data (main fields + updated components)
    await strapi.db.query(uid).update({
      where: { id: entry.id },
      data: { ...cloneDeep(entryData), ...componentData },
    });
  });
};

const localizations = () => ({
  syncNonLocalizedAttributes,
});

type LocalizationsService = typeof localizations;

export default localizations;
export type { LocalizationsService };
