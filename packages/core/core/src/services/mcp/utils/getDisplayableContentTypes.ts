import type { Schema, Struct } from '@strapi/types';

export type DisplayableContentType = {
  uid: string;
  contentType: Struct.ContentTypeSchema;
};

/**
 * Filters content types to return only user-visible content types.
 * Excludes admin internal types (admin::*), Strapi core types (strapi::*),
 * and content types marked as not visible.
 *
 * @param contentTypes - The contentTypes object from strapi instance
 * @returns Array of displayable content types with their UIDs
 */
export const getDisplayableContentTypes = (
  contentTypes: Schema.ContentTypes | null | undefined
): DisplayableContentType[] => {
  if (contentTypes === undefined || contentTypes === null) {
    return [];
  }

  // Cast to Record for iteration - the Schema.ContentTypes type has a stricter index signature
  const contentTypesRecord = contentTypes as unknown as Record<string, Struct.ContentTypeSchema>;

  return Object.entries(contentTypesRecord)
    .filter(([uid, ct]) => {
      // Skip null/undefined content types
      if (ct === null || ct === undefined) {
        return false;
      }
      // Skip admin internal types
      if (uid.startsWith('admin::')) {
        return false;
      }
      // Skip Strapi core types
      if (uid.startsWith('strapi::')) {
        return false;
      }
      // Only include collection types and single types that are visible
      if (ct.kind === 'collectionType' || ct.kind === 'singleType') {
        // visible is a runtime property not always in the type definition
        return (ct as Struct.ContentTypeSchema & { visible?: boolean }).visible !== false;
      }
      return false;
    })
    .map(([uid, contentType]) => ({
      uid,
      contentType,
    }));
};
