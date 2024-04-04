import { isNil } from 'lodash/fp';

import { errors } from '@strapi/utils';

/**
 * From a request or query object, validates and returns the locale and status of the document
 */
export const getDocumentLocaleAndStatus = (request: any) => {
  const { locale, status, ...rest } = request || {};
  // Sanitize locale and status
  if (!isNil(locale) && typeof locale !== 'string') {
    throw new errors.ValidationError(`Invalid locale: ${locale}`);
  }

  if (!isNil(status) && !['draft', 'published'].includes(status)) {
    throw new errors.ValidationError(`Invalid status: ${status}`);
  }

  return { locale, status, ...rest };
};
