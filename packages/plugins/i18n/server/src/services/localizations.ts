import { cloneDeep, isEmpty } from 'lodash/fp';

import { type Schema } from '@strapi/types';
import { async, traverseEntity } from '@strapi/utils';
import { getService } from '../utils';

const omitIdAndLocale = (entry?: object | null) => {
  if (entry && typeof entry === 'object' && 'id' in entry && 'locale' in entry) {
    const { id, locale, ...rest } = entry;
    return rest;
  }

  return entry;
};

const omitFieldsFromRelations = (data: any, schema: Schema.ContentType) => {
  return traverseEntity(
    ({ key, value, attribute }, { set }) => {
      if (attribute.type === 'relation') {
        if (Array.isArray(value)) {
          const newValue = value.map((entry) => {
            return omitIdAndLocale(entry);
          });

          set(key, newValue as any);
        } else if (typeof value === 'object') {
          set(key, omitIdAndLocale(value) as any);
        }
      }
    },
    { schema, getModel: strapi.getModel.bind(strapi) },
    data
  );
};

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

  const entryData = await strapi.documents(uid).omitComponentData(model, nonLocalizedAttributes);

  // We omit the ids and locales from the relational data so the components can
  // be updated correctly
  const cleanedData = await omitFieldsFromRelations(nonLocalizedAttributes, model);

  await async.map(localeEntriesToUpdate, async (entry: any) => {
    const transformedData = await strapi.documents.utils.transformData(cloneDeep(cleanedData), {
      uid,
      status,
      locale: entry.locale,
      allowMissingId: true,
    });

    // Update or create components for the entry
    const componentData = await strapi
      .documents(uid)
      .updateComponents(uid, entry, transformedData as any);

    // Update every other locale entry of this documentId in the same status
    // We need to support both statuses incase we are working with a content type
    // without draft and publish enabled
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
