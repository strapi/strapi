import type { Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

import { getDefaultMainField } from '../../services/utils/configuration/attributes';

export const FALLBACK_MAIN_FIELD = 'documentId';

export type HomepagePermissionChecker = {
  cannot: {
    read: (entity: null, field: string) => boolean;
  };
};

/**
 * Removes invalid entries left in the fields array after permission sanitization.
 */
export const compactSanitizedFields = (fields: unknown): string[] | undefined => {
  if (!Array.isArray(fields)) {
    return undefined;
  }

  return fields.filter((field): field is string => typeof field === 'string');
};

/**
 * Resolves the main field used for homepage widgets, falling back when the user cannot read it.
 */
export const resolveReadableMainField = (
  contentType: Schema.ContentType,
  configuration: { settings?: { mainField?: string } } | undefined,
  permissionChecker: HomepagePermissionChecker
): string => {
  const candidateMainField = configuration?.settings?.mainField ?? getDefaultMainField(contentType);

  if (permissionChecker.cannot.read(null, candidateMainField)) {
    return FALLBACK_MAIN_FIELD;
  }

  return candidateMainField;
};

/**
 * Builds the fields array requested before permission sanitization.
 */
export const buildHomepageQueryFields = (
  contentType: Schema.ContentType,
  mainField: string
): string[] => {
  const fields = [FALLBACK_MAIN_FIELD, 'updatedAt'];

  if (contentTypes.hasDraftAndPublish(contentType)) {
    fields.push('publishedAt');
  }

  if (mainField !== FALLBACK_MAIN_FIELD && !fields.includes(mainField)) {
    fields.push(mainField);
  }

  if ((contentType.pluginOptions?.i18n as { localized?: boolean } | undefined)?.localized) {
    fields.push('locale');
  }

  return fields;
};

/**
 * Picks a main field that is present in the sanitized fields selection.
 */
export const resolveTitleField = (
  mainField: string,
  sanitizedFields: string[] | undefined
): string => {
  if (sanitizedFields?.includes(mainField)) {
    return mainField;
  }

  return FALLBACK_MAIN_FIELD;
};

/**
 * Formats the main field value as the recent document title.
 * The main field can be any listable attribute (integer, boolean, date…), but the widgets render
 * the title as text. An empty value returns an empty string, which the widgets render as a
 * translated "Untitled", like the rest of the content manager.
 * A main field the user cannot read is replaced by the document id before this point
 * (see `resolveReadableMainField` and `resolveTitleField`).
 * Any other value has no text form and returns an empty string ("Untitled"). No main field reaches
 * here as an object: the main field must be sortable, which excludes component, media, json and
 * dynamic zone attributes, and the homepage query does not populate a to-one relation main field.
 */
export const formatRecentDocumentTitle = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return '';
};
