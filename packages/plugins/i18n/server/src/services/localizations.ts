import { isEmpty, cloneDeep, omit } from 'lodash';

import type { Schema } from '@strapi/types';
import { async } from '@strapi/utils';
import { getService } from '../utils';

/**
 * Mutates the provided data object in place and returns the same reference
 * with populated media values replaced by their upload file IDs.
 */
const normalizeMediaIds = (
  schema: Schema.ContentType | Schema.Component,
  data: Record<string, any>
): Record<string, any> => {
  if (!schema?.attributes || !data || typeof data !== 'object') {
    return data;
  }

  Object.entries(schema.attributes).forEach(([attributeName, attribute]) => {
    const value = data[attributeName];

    if (value == null) {
      return;
    }

    if (attribute.type === 'media') {
      if (attribute.multiple) {
        data[attributeName] = Array.isArray(value)
          ? value.map((file: unknown) =>
              file && typeof file === 'object' && 'id' in file ? file.id : file
            )
          : value;
      } else {
        data[attributeName] =
          value && typeof value === 'object' && 'id' in value ? value.id : value;
      }

      return;
    }

    if (attribute.type === 'component') {
      const componentSchema = strapi.getModel(attribute.component);

      if (attribute.repeatable && Array.isArray(value)) {
        value.forEach((componentValue: Record<string, any>) =>
          normalizeMediaIds(componentSchema, componentValue)
        );
      } else {
        normalizeMediaIds(componentSchema, value);
      }

      return;
    }

    if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
      value.forEach((componentValue: Record<string, any>) => {
        if (componentValue?.__component) {
          normalizeMediaIds(strapi.getModel(componentValue.__component), componentValue);
        }
      });
    }
  });

  return data;
};

const countRelationTargets = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value == null ? 0 : 1;
};

/**
 * Whether resolving `source` for another locale lost a relation target, anywhere inside it.
 *
 * A target with no entry in that locale is left out of the transformed `set`. A longer `set` is
 * fine: one document can map to both its draft and published entries.
 */
const hasDroppedRelationTarget = (
  schema: Schema.ContentType | Schema.Component,
  source: Record<string, any>,
  transformed: Record<string, any>
): boolean => {
  if (!schema?.attributes || !source || !transformed) {
    return false;
  }

  return Object.entries(schema.attributes).some(([attributeName, attribute]) => {
    const sourceValue = source[attributeName];
    const transformedValue = transformed[attributeName];

    if (attribute.type === 'relation') {
      return (
        Array.isArray(transformedValue?.set) &&
        transformedValue.set.length < countRelationTargets(sourceValue)
      );
    }

    if (attribute.type === 'component') {
      const componentSchema = strapi.getModel(attribute.component);

      if (attribute.repeatable && Array.isArray(sourceValue) && Array.isArray(transformedValue)) {
        return sourceValue.some((componentValue, index) =>
          hasDroppedRelationTarget(componentSchema, componentValue, transformedValue[index])
        );
      }

      return hasDroppedRelationTarget(componentSchema, sourceValue, transformedValue);
    }

    if (
      attribute.type === 'dynamiczone' &&
      Array.isArray(sourceValue) &&
      Array.isArray(transformedValue)
    ) {
      return sourceValue.some(
        (componentValue, index) =>
          componentValue?.__component &&
          hasDroppedRelationTarget(
            strapi.getModel(componentValue.__component),
            componentValue,
            transformedValue[index]
          )
      );
    }

    return false;
  });
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

  const normalizedNonLocalizedAttributes = normalizeMediaIds(model, nonLocalizedAttributes);

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

  const entryData = await strapi.documents(uid).omitComponentData(normalizedNonLocalizedAttributes);

  await async.map(localeEntriesToUpdate, async (entry: any) => {
    const transformedData = await strapi.documents.utils.transformData(
      cloneDeep(normalizedNonLocalizedAttributes),
      {
        uid,
        status,
        locale: entry.locale,
        allowMissingId: true,
      }
    );

    // A shared component that loses a relation here would be written without it, and the next
    // save from this locale would copy that loss to every other locale. Component rows are
    // specific to a locale, so the whole field is left as it is in this locale.
    const attributesToSkip = Object.keys(transformedData).filter((attributeName) =>
      hasDroppedRelationTarget(
        model,
        { [attributeName]: normalizedNonLocalizedAttributes[attributeName] },
        { [attributeName]: (transformedData as Record<string, any>)[attributeName] }
      )
    );

    if (attributesToSkip.length > 0) {
      strapi.log.warn(
        `i18n: not syncing ${attributesToSkip.join(', ')} of ${uid} "${documentId}" to locale "${entry.locale}": a relation it holds has no entry in that locale.`
      );
    }

    // Update or create non localized components for the entry
    const componentData = await strapi
      .documents(uid)
      .updateComponents(entry, omit(transformedData, attributesToSkip) as any);

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
