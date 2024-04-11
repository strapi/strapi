import { isNil } from 'lodash/fp';

import { errors } from '@strapi/utils';

/**
 * From a request or query object, validates and returns the locale and status of the document
 */
export const getDocumentLocaleAndStatus = (
  request: any,
  opts: {
    allowMultipleLocales?: boolean;
  } = { allowMultipleLocales: true }
) => {
  const { allowMultipleLocales } = opts;
  const { locale, status, ...rest } = request || {};

  // Sanitize locale and status
  if (!isNil(locale)) {
    const isLocaleValid =
      typeof locale === 'string' ||
      (allowMultipleLocales &&
        Array.isArray(locale) &&
        locale.every((item) => typeof item === 'string'));

    if (!isLocaleValid) {
      throw new errors.ValidationError(`Invalid locale: ${locale}`);
    }
  }

  if (!isNil(status) && !['draft', 'published'].includes(status)) {
    throw new errors.ValidationError(`Invalid status: ${status}`);
  }

  return { locale, status, ...rest };
};
