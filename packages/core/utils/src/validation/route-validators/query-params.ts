import * as z from 'zod/v4';

/**
 * Standard query parameter validators that can be reused across different route validators
 */

export const queryFieldsSchema = z.union([z.string(), z.array(z.string())]);

export const queryPopulateSchema = z.union([
  z.literal('*'),
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.any()),
]);

export const querySortSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.enum(['asc', 'desc'])),
]);

export const paginationSchema = z.union([
  z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
  z.object({
    start: z.number().int().min(0),
    limit: z.number().int().positive(),
  }),
]);

export const filtersSchema = z.record(z.string(), z.any());

export const localeSchema = z.string();

export const statusSchema = z.enum(['draft', 'published']);

export const searchQuerySchema = z.string();
