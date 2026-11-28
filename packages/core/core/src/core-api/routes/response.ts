import * as z from 'zod/v4';

/**
 * Pagination object on collection `find` responses.
 *
 * Page-based (`page` / `pageSize`) and offset-based (`start` / `limit`) are
 * alternatives on the same endpoint. `total` and `pageCount` are omitted when
 * `pagination[withCount]` is false.
 */
const pagedPaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  pageCount: z.number().int().optional(),
  total: z.number().int().optional(),
});

const offsetPaginationMetaSchema = z.object({
  start: z.number().int(),
  limit: z.number().int(),
  total: z.number().int().optional(),
});

/**
 * `{ data, meta: { pagination } }` envelope returned by collection `find`.
 */
export const collectionResponseSchema = <T extends z.ZodArray>(data: T) =>
  z.object({
    data,
    meta: z.object({
      pagination: z.union([pagedPaginationMetaSchema, offsetPaginationMetaSchema]),
    }),
  });

/**
 * `{ data, meta: {} }` envelope. findOne, create, update, and single-type
 * find/update return this. Delete routes reuse it for their documented JSON body.
 */
export const documentResponseSchema = <T extends z.ZodType>(data: T) =>
  z.object({
    data,
    meta: z.object({}),
  });
