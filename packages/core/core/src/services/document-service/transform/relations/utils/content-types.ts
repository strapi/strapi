import { Common } from '@strapi/types';

/**
 * Check if the UID is from a content type
 */
export const isContentType = (uid: string): boolean => {
  const contentType = strapi.contentType(uid as Common.UID.ContentType);
  return !!contentType;
};
