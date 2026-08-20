import * as z from 'zod/v4';

/**
 * Standard query parameter validators that can be reused across different route validators
 *
 * These schemas provide the basic structure validation for common Strapi API query parameters.
 * They can be used as building blocks for both generic validation and schema-aware validation.
 */

/**
 * Fields parameter validation
 * Supports: 'title', ['title', 'name'], or '*'
 */
export const queryFieldsSchema = z
  .union([z.string(), z.array(z.string())])
  .describe('Select specific fields to return in the response');

/**
 * Populate parameter validation
 * Supports: '*', 'relation', ['relation1', 'relation2'], or complex objects
 */
export const queryPopulateSchema = z
  .union([z.literal('*'), z.string(), z.array(z.string()), z.record(z.string(), z.any())])
  .describe('Specify which relations to populate in the response');

/**
 * Sort parameter validation
 * Supports: 'name', ['name', 'title'], { name: 'asc' }, or [{ name: 'desc' }]
 */
export const querySortSchema = z
  .union([
    z.string(),
    z.array(z.string()),
    z.record(z.string(), z.enum(['asc', 'desc'])),
    z.array(z.record(z.string(), z.enum(['asc', 'desc']))),
  ])
  .describe('Sort the results by specified fields');

/**
 * Pagination parameter validation
 * Supports both page-based and offset-based pagination
 */
export const paginationSchema = z
  .intersection(
    z.object({
      withCount: z.boolean().optional().describe('Include total count in response'),
    }),
    z.union([
      z
        .object({
          page: z.number().int().positive().describe('Page number (1-based)'),
          pageSize: z.number().int().positive().describe('Number of entries per page'),
        })
        .describe('Page-based pagination'),
      z
        .object({
          start: z.number().int().min(0).describe('Number of entries to skip'),
          limit: z.number().int().positive().describe('Maximum number of entries to return'),
        })
        .describe('Offset-based pagination'),
    ])
  )
  .describe('Pagination parameters');

/**
 * Filters parameter validation
 * Supports any object structure for filtering
 */
export const filtersSchema = z.record(z.string(), z.any()).describe('Apply filters to the query');

/**
 * Locale parameter validation
 * Used for internationalization
 */
export const localeSchema = z.string().describe('Specify the locale for localized content');

/**
 * Status parameter validation
 * Used for draft & publish functionality
 */
export const statusSchema = z.enum(['draft', 'published']).describe('Filter by publication status');

/**
 * Search query parameter validation
 * Used for text search functionality
 */
export const searchQuerySchema = z.string().describe('Search query string');

/**
 * Complete collection of all standard query parameter schemas
 * This object provides easy access to all available query parameter validators
 */
export const queryParameterSchemas = {
  fields: queryFieldsSchema,
  populate: queryPopulateSchema,
  sort: querySortSchema,
  pagination: paginationSchema,
  filters: filtersSchema,
  locale: localeSchema,
  status: statusSchema,
  _q: searchQuerySchema,
} as const;

/**
 * Query parameter names supported by Strapi's API
 */
export type QueryParam = keyof typeof queryParameterSchemas;
