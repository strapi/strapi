import { errors } from '@strapi/utils';

/**
 * From a request or query object, validates and returns the locale and status of the document
 */
export const getDocumentLocaleAndStatus = (request: any) => {
  const { locale, status, ...rest } = request || {};
  // Sanitize locale and status
  // Check locale format is a valid locale identifier
  if (locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
    throw new errors.ValidationError(`Invalid locale format: ${locale}`);
  }

  if (status && !['draft', 'published'].includes(status)) {
    throw new errors.ValidationError(`Invalid status: ${status}`);
  }

  return { locale, status, ...rest };
};
