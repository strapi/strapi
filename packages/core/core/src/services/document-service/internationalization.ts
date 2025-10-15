import type { Struct, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';
import { curry, assoc } from 'lodash/fp';

type Transform = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Modules.Documents.Params.All;

type AsyncTransform = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Promise<Modules.Documents.Params.All>;

const getDefaultLocale = async (): Promise<string> => {
  return strapi.plugin('i18n').service('locales').getDefaultLocale();
};

const defaultLocale: AsyncTransform = async (contentType, params) => {
  if (!strapi.plugin('i18n').service('content-types').isLocalizedContentType(contentType)) {
    return params;
  }

  if (!params.locale) {
    return assoc('locale', await getDefaultLocale(), params);
  }

  return params;
};

/**
 * Add locale lookup query to the params
 */
const localeToLookup: Transform = (contentType, params) => {
  if (
    !params.locale ||
    !strapi.plugin('i18n').service('content-types').isLocalizedContentType(contentType)
  ) {
    return params;
  }

  if (typeof params.locale !== 'string') {
    // localeToLookup accepts locales of '*'. This is because the document
    // service functions that use this transform work with the '*' locale
    // to return all locales.
    throw new errors.ValidationError(
      `Invalid locale param ${String(params.locale)} provided. Document locales must be strings.`
    );
  }

  return assoc(['lookup', 'locale'], params.locale, params);
};

/**
 * Add locale lookup query to the params
 */
const multiLocaleToLookup: Transform = (contentType, params) => {
  if (!strapi.plugin('i18n').service('content-types').isLocalizedContentType(contentType)) {
    return params;
  }

  if (params.locale) {
    if (params.locale === '*') {
      return params;
    }

    return assoc(['lookup', 'locale'], params.locale, params);
  }

  return params;
};

/**
 * Translate locale status parameter into the data that will be saved
 */
const localeToData: Transform = (contentType, params) => {
  if (!strapi.plugin('i18n').service('content-types').isLocalizedContentType(contentType)) {
    return params;
  }

  if (params.locale) {
    const isValidLocale = typeof params.locale === 'string' && params.locale !== '*';
    if (isValidLocale) {
      return assoc(['data', 'locale'], params.locale, params);
    }

    throw new errors.ValidationError(
      `Invalid locale param ${params.locale} provided. Document locales must be strings.`
    );
  }

  return params;
};

/**
 * Copy non-localized fields from an existing entry to a new entry being created
 * for a different locale of the same document. Returns a new object with the merged data.
 */
const copyNonLocalizedFields = async (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  documentId: string,
  dataToCreate: Record<string, any>
): Promise<Record<string, any>> => {
  // Check if this is a localized content type and if i18n plugin is available
  const i18nService = strapi.plugin('i18n')?.service('content-types');
  if (!i18nService?.isLocalizedContentType(contentType)) {
    return dataToCreate;
  }

  // Find an existing entry for the same document to copy unlocalized fields from
  const existingEntry = await strapi.db.query(contentType.uid).findOne({
    where: { documentId },
    // Prefer published entry, but fall back to any entry
    orderBy: { publishedAt: 'desc' },
  });

  // If an entry exists in another locale, copy its non-localized fields
  if (existingEntry) {
    const mergedData = { ...dataToCreate };
    i18nService.fillNonLocalizedAttributes(mergedData, existingEntry, {
      model: contentType.uid,
    });
    return mergedData;
  }

  return dataToCreate;
};

const defaultLocaleCurry = curry(defaultLocale);
const localeToLookupCurry = curry(localeToLookup);
const multiLocaleToLookupCurry = curry(multiLocaleToLookup);
const localeToDataCurry = curry(localeToData);

export {
  defaultLocaleCurry as defaultLocale,
  localeToLookupCurry as localeToLookup,
  localeToDataCurry as localeToData,
  multiLocaleToLookupCurry as multiLocaleToLookup,
  copyNonLocalizedFields,
};
