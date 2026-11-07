/**
 * Document Service record -> the shape Better Auth expects back.
 *
 * Ported from plugin-better-auth by Boaz Poolman (strapi-community), MIT licensed.
 * https://github.com/strapi-community/plugin-better-auth
 *
 * The adapter declares `supportsDates: true`, so Better Auth expects `Date` objects, but Strapi
 * returns datetime attributes as ISO strings. The original recognised dates by pattern; that turns
 * a text field that merely looks like a datetime into a `Date`, so this converts only the fields
 * Better Auth's own schema declares as dates.
 *
 * The record keeps its `documentId`; the adapter factory renames it to `id` (`mapKeysTransformOutput`).
 */
export const transformOutput = <T extends Record<string, unknown>>(
  record: T,
  dateFields: ReadonlySet<string>
): T => {
  const output: Record<string, unknown> = { ...record };

  for (const field of dateFields) {
    const value = output[field];

    if (typeof value !== 'string') {
      continue;
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      output[field] = date;
    }
  }

  return output as T;
};
