import * as z from 'zod/v4';
import { queryParameterSchemas, type QueryParam } from './query-params';

/**
 * AbstractRouteValidator provides the foundation for validating routes.
 *
 * This abstract class provides common query parameter validators that can be reused
 * across different route validators in Strapi. It serves as a building block for
 * both generic validation (plugins, external packages) and schema-aware validation
 * (core content types).
 */
export abstract class AbstractRouteValidator {
  /**
   * Creates a fields query parameter validator
   * Validates field selection for API responses
   */
  get queryFields() {
    return queryParameterSchemas.fields;
  }

  /**
   * Creates a populate query parameter validator
   * Validates which relations to populate in the response
   */
  get queryPopulate() {
    return queryParameterSchemas.populate;
  }

  /**
   * Creates a sort query parameter validator
   * Validates sorting options for list endpoints
   */
  get querySort() {
    return queryParameterSchemas.sort;
  }

  /**
   * Creates a pagination query parameter validator
   * Supports both page-based and offset-based pagination
   */
  get pagination() {
    return queryParameterSchemas.pagination;
  }

  /**
   * Creates a filters query parameter validator
   * Validates filtering options for list endpoints
   */
  get filters() {
    return queryParameterSchemas.filters;
  }

  /**
   * Creates a locale query parameter validator
   * Used for internationalization
   */
  get locale() {
    return queryParameterSchemas.locale;
  }

  /**
   * Creates a status query parameter validator
   * Used for draft & publish functionality
   */
  get status() {
    return queryParameterSchemas.status;
  }

  /**
   * Creates a search query parameter validator
   * Used for text search functionality
   */
  get query() {
    return queryParameterSchemas._q;
  }

  /**
   * Provides access to all base query parameter validators
   */
  protected get baseQueryValidators() {
    return {
      fields: () => this.queryFields.optional(),
      populate: () => this.queryPopulate.optional(),
      sort: () => this.querySort.optional(),
      filters: () => this.filters.optional(),
      pagination: () => this.pagination.optional(),
      locale: () => this.locale.optional(),
      status: () => this.status.optional(),
      _q: () => this.query.optional(),
    };
  }

  /**
   * Helper method to create a query parameters object with specified validators
   *
   * @param params - Array of query parameter names to include
   * @returns Object containing Zod schemas for the requested query parameters
   */
  queryParams(params: QueryParam[]): Record<string, z.ZodSchema> {
    const validators = this.baseQueryValidators;

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
