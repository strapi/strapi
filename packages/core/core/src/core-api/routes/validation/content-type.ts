import type { Core, UID } from '@strapi/types';
import { z } from 'zod';

import { AbstractCoreRouteValidator, mapAttributeToSchema } from './common';

type QueryParam = 'fields' | 'populate' | 'sort';

/**
 * A validator for core content-type routes.
 *
 * Provides validation schemas and utilities for handling content-type-specific route validation.
 *
 * @example
 * ```ts
 * const strapi = // ... strapi instance
 * const uid = 'api::article.article'
 * const validator = new CoreContentTypeRouteValidator(strapi, uid);
 *
 * // Get validation schema for document
 * const documentSchema = validator.document;
 *
 * // Validate query parameters
 * const querySchema = validator.query(['fields', 'populate', 'sort']);
 * ```
 */
export class CoreContentTypeRouteValidator extends AbstractCoreRouteValidator<UID.ContentType> {
  /**
   * Creates a new instance of CoreContentTypeRouteValidator
   *
   * @param strapi - The Strapi instance
   * @param uid - The content-type's unique identifier
   */
  constructor(strapi: Core.Strapi, uid: UID.ContentType) {
    super(strapi, uid);
  }

  /**
   * Generates a validation schema for document IDs
   *
   * @returns A schema that validates UUIDs
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const idSchema = validator.documentID;
   * ```
   */
  get documentID() {
    return z.string().uuid().describe('The document ID, represented by a UUID');
  }

  /**
   * Generates a comprehensive validation schema for a single document.
   *
   * Combines scalar fields and populatable fields into a single schema.
   *
   * @returns A schema for validating complete documents
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const docSchema = validator.document;
   * ```
   */
  get document() {
    const { _scalarFields, _populatableFields } = this;

    const entries = Object.entries({ ..._scalarFields, ..._populatableFields });

    const attributesSchema = entries.reduce((acc, [attributeName, attribute]) => {
      return acc.merge(z.object({ [attributeName]: mapAttributeToSchema(attribute) }));
    }, z.object({}));

    const defaultSchema = z.object({ documentId: this.documentID });

    return defaultSchema.merge(attributesSchema);
  }

  /**
   * Generates a validation schema for an array of documents
   *
   * @returns A schema for validating arrays of documents
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const docsSchema = validator.documents;
   * ```
   */
  get documents() {
    return z.array(this.document);
  }

  /**
   * Creates validation schemas for query parameters
   *
   * @param params - Array of query parameters to validate ('fields', 'populate', 'sort', ...)
   * @returns Object containing validation schemas for requested parameters
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const querySchemas = validator.query(['fields', 'populate']);
   * ```
   */
  query(params: QueryParam[]): Partial<Record<QueryParam, z.Schema>> {
    const map = {
      fields: () => this.queryFields,
      populate: () => this.queryPopulate,
      sort: () => this.querySort,
    };

    return params.reduce(
      (acc, param) => ({ ...acc, [param]: map[param]() }),
      {} as Partial<Record<QueryParam, z.Schema>>
    );
  }

  /**
   * Generates a validation schema for field selection in queries
   *
   * @returns A schema for validating field selection
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const fieldsSchema = validator.queryFields;
   * ```
   */
  get queryFields() {
    return this.scalarFieldsArray
      .readonly()
      .describe(
        `The fields to return, this doesn't include populatable fields like relations, components, files, or dynamic zones`
      );
  }

  /**
   * Generates a validation schema for populate operations.
   *
   * Allows wildcard (*), single field, and multiple field population.
   *
   * @returns A schema for validating populate parameters
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const populateSchema = validator.queryPopulate;
   * ```
   */
  get queryPopulate() {
    const wildcardPopulate = z
      .literal('*')
      .readonly()
      .describe(
        'Populate all the first level relations, components, files, and dynamic zones for the entry'
      );

    const singleFieldPopulate = this.populatableFieldsEnum
      .readonly()
      .describe('Populate a single relation, component, file, or dynamic zone');

    const multiPopulate = this.populatableFieldsArray.describe(
      'Populate a selection of multiple relations, components, files, or dynamic zones'
    );

    return z.union([wildcardPopulate, singleFieldPopulate, multiPopulate]);
  }

  /**
   * Generates a validation schema for sorting parameters.
   *
   * Allows various sorting formats including single field, multiple fields, and direction specifications
   *
   * @returns A schema for validating sort parameters
   *
   * @example
   * ```ts
   * const validator = new CoreContentTypeRouteValidator(strapi, uid);
   * const sortSchema = validator.querySort;
   * ```
   *
   * @remarks
   * - Nested sorts are currently not supported
   */
  get querySort() {
    const orderDirection = z.enum(['asc', 'desc']);

    // TODO: Handle nested sorts but very low priority, very little usage
    return z
      .union(
        [
          this.scalarFieldsEnum, // 'name' | 'title'
          this.scalarFieldsArray, // ['name', 'title']
          this.fieldRecord(orderDirection), // { name: 'desc' } | { title: 'asc' }
          z.array(this.fieldRecord(orderDirection)), // [{ name: 'desc'}, { title: 'asc' }]
        ],
        { description: 'Sort Union' }
      )
      .optional()
      .describe('Sort the result');
  }
}
