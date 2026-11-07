/**
 * Better Auth `sortBy` -> Document Service `sort`.
 *
 * Ported from plugin-better-auth by Boaz Poolman (strapi-community), MIT licensed.
 * https://github.com/strapi-community/plugin-better-auth
 *
 * Better Auth sorts by one field: `{ field: 'createdAt', direction: 'desc' }`.
 * Strapi takes `'createdAt:desc'`. `resolveField` turns the logical field name into the stored one,
 * which is where `id` becomes `documentId`.
 */
export interface SortBy {
  field: string;
  direction: 'asc' | 'desc';
}

export const transformSort = (
  sortBy: SortBy | undefined,
  resolveField: (field: string) => string
): string | undefined => {
  if (!sortBy?.field) {
    return undefined;
  }

  return `${resolveField(sortBy.field)}:${sortBy.direction === 'desc' ? 'desc' : 'asc'}`;
};
