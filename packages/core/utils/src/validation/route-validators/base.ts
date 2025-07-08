import * as z from 'zod/v4';
import {
  queryFieldsSchema,
  queryPopulateSchema,
  querySortSchema,
  paginationSchema,
  filtersSchema,
  localeSchema,
  statusSchema,
  searchQuerySchema,
} from './query-params';

/**
 * QueryParam represents the standard query parameters supported by Strapi's API
 */
export type QueryParam =
  | 'fields'
  | 'populate'
  | 'sort'
  | 'filters'
  | 'pagination'
  | 'locale'
  | 'status'
  | '_q';

/**
 * AbstractRouteValidator provides the foundation for validating routes.
 *
 * This abstract class provides common query parameter validators that can be reused
 * across different route validators in Strapi.
 */
export abstract class AbstractRouteValidator {
  /**
   * Creates a fields query parameter validator
   * Validates field selection for API responses
   */
  get queryFields() {
    return queryFieldsSchema;
  }

  /**
   * Creates a populate query parameter validator
   * Validates which relations to populate in the response
   */
  get queryPopulate() {
    return queryPopulateSchema;
  }

  /**
   * Creates a sort query parameter validator
   * Validates sorting options for list endpoints
   */
  get querySort() {
    return querySortSchema;
  }

  /**
   * Creates a pagination query parameter validator
   * Supports both page-based and offset-based pagination
   */
  get pagination() {
    return paginationSchema;
  }

  /**
   * Creates a filters query parameter validator
   * Validates filtering options for list endpoints
   */
  get filters() {
    return filtersSchema;
  }

  /**
   * Creates a locale query parameter validator
   * Used for internationalization
   */
  get locale() {
    return localeSchema;
  }

  /**
   * Creates a status query parameter validator
   * Used for draft & publish functionality
   */
  get status() {
    return statusSchema;
  }

  /**
   * Creates a search query parameter validator
   * Used for text search functionality
   */
  get query() {
    return searchQuerySchema;
  }

  /**
   * Helper method to create a query parameters object with specified validators
   *
   * @param params - Array of query parameter names to include
   * @returns Object containing Zod schemas for the requested query parameters
   */
  queryParams(params: QueryParam[]): Record<string, z.ZodSchema> {
    const validators: Record<QueryParam, () => z.ZodSchema> = {
      fields: () => this.queryFields.optional(),
      populate: () => this.queryPopulate.optional(),
      sort: () => this.querySort.optional(),
      filters: () => this.filters.optional(),
      pagination: () => this.pagination.optional(),
      locale: () => this.locale.optional(),
      status: () => this.status.optional(),
      _q: () => this.query.optional(),
    };

    return params.reduce(
      (acc, param) => {
        if (param in validators) {
          acc[param] = validators[param]();
        }
        return acc;
      },
      {} as Record<string, z.ZodSchema>
    );
  }
}
