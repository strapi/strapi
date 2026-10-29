import type { Struct, Modules, Schema } from '@strapi/types';
import { errors, contentTypes } from '@strapi/utils';
import { assign, curry } from 'lodash';

type Transform = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Modules.Documents.Params.All;

type AsyncTransform = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Promise<Modules.Documents.Params.All>;

const getDefaultLocale = async (): Promise<string | null> => {
  return strapi.localization.getDefaultLocale();
};

const defaultLocale: AsyncTransform = async (contentType, params) => {
  if (!strapi.localization.isLocalizedContentType(contentType)) {
    return params;
  }

  if (!params.locale) {
    return assign({}, params, { locale: await getDefaultLocale() });
  }

  return params;
};

/**
 * Add locale lookup query to the params
 */
const localeToLookup: Transform = (contentType, params) => {
  if (!params.locale || !strapi.localization.isLocalizedContentType(contentType)) {
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

  return { ...params, lookup: { ...params.lookup, locale: params.locale } };
};

/**
 * Add locale lookup query to the params
 */
const multiLocaleToLookup: Transform = (contentType, params) => {
  if (!strapi.localization.isLocalizedContentType(contentType)) {
    return params;
  }

  if (params.locale) {
    if (params.locale === '*') {
      return params;
    }

    return { ...params, lookup: { ...params.lookup, locale: params.locale } };
  }

  return params;
};

/**
 * Translate locale status parameter into the data that will be saved
 */
const localeToData: Transform = (contentType, params) => {
  if (!strapi.localization.isLocalizedContentType(contentType)) {
    return params;
  }

  if (params.locale) {
    const isValidLocale = typeof params.locale === 'string' && params.locale !== '*';
    if (isValidLocale) {
      return { ...params, data: { ...params.data, locale: params.locale } };
    }

    throw new errors.ValidationError(
      `Invalid locale param ${params.locale} provided. Document locales must be strings.`
    );
  }

  return params;
};

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
export type CopyNonLocalizedFieldsOptions = {
  /**
   * Which publication status to copy from. Locale insert of a draft must not
   * pick an older published row.
   */
  status?: 'draft' | 'published';
};

const statusWhere = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  status: 'draft' | 'published'
) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return {};
  }

  return status === 'published' ? { publishedAt: { $ne: null } } : { publishedAt: { $null: true } };
};

/**
 * Copy non-localized fields from an existing entry to a new entry being created
 * for a different locale of the same document. Returns a new object with the merged data.
 */
const copyNonLocalizedFields = async (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  documentId: string,
  dataToCreate: Record<string, any>,
  options: CopyNonLocalizedFieldsOptions = {}
): Promise<Record<string, any>> => {
  if (!strapi.localization.isLocalizedContentType(contentType)) {
    return dataToCreate;
  }

  const status = options.status ?? 'draft';

  // Select the default-locale sibling of the status being written. Ordering by
  // publishedAt is database-dependent because drafts store NULL.
  const attributesToPopulate = strapi.localization.getNestedPopulateOfNonLocalizedAttributes(
    contentType.uid
  );
  const defaultLocaleCode = await getDefaultLocale();
  const publicationWhere = statusWhere(contentType, status);
  const query = strapi.db.query(contentType.uid);
  let existingEntry = await query.findOne({
    where: {
      documentId,
      locale: defaultLocaleCode,
      ...publicationWhere,
    },
    populate: attributesToPopulate,
  });

  // A document can exist without its default locale. Keep locale creation
  // functional in that case, but still prefer the matching status.
  if (!existingEntry) {
    existingEntry = await query.findOne({
      where: { documentId, ...publicationWhere },
      populate: attributesToPopulate,
    });
  }

  if (!existingEntry) {
    return dataToCreate;
  }

  const mergedData = { ...dataToCreate };
  strapi.localization.fillNonLocalizedAttributes(mergedData, existingEntry, {
    model: contentType.uid,
  });
  return normalizeMediaIds(contentType, mergedData);
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
