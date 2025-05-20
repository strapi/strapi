import type { Core, Schema, UID } from '@strapi/types';

import { contentTypes } from '@strapi/utils';
import { z } from 'zod';

import { mapAttributeToInputSchema, mapAttributeToSchema } from './attributes';
import { AbstractCoreRouteValidator } from './common';

export type QueryParam =
  | 'fields'
  | 'populate'
  | 'sort'
  | 'status'
  | 'locale'
  | 'pagination'
  | 'filters'
  | '_q';

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
    return z.uuid().describe('The document ID, represented by a UUID');
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

    const attributesSchema = entries
      // Remove passwords from the attribute list
      // TODO: Make sure we're not leaking other fields like that
      .filter(([, attribute]) => !['password'].includes(attribute.type))
      // Merge all attributes into a single schema
      .reduce((acc, [attributeName, attribute]) => {
        return acc.extend({
          get [attributeName]() {
            return mapAttributeToSchema(attribute);
          },
        });
      }, z.object({}));

    return z
      .object({
        documentId: this.documentID,
        id: z.number(),
      })
      .extend(attributesSchema.shape);
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
      .union([
        this.scalarFieldsEnum, // 'name' | 'title'
        this.scalarFieldsArray, // ['name', 'title']
        this.fieldRecord(orderDirection), // { name: 'desc' } | { title: 'asc' }
        z.array(this.fieldRecord(orderDirection)), // [{ name: 'desc'}, { title: 'asc' }]
      ])
      .describe('Sort the result');
  }

  get locale() {
    return z.string().optional().describe('Select a locale');
  }

  get status() {
    return z
      .enum(['draft', 'published'])
      .describe('Fetch documents based on their status. Default to "published" if not specified.');
  }

  get pagination() {
    return z
      .intersection(
        z.object({ withCount: z.boolean().optional() }),
        z.union([
          z
            .object({ page: z.number(), pageSize: z.number() })
            .describe('Specify a page number and the number of entries per page'),
          z
            .object({ start: z.number(), limit: z.number() })
            .describe('Specify how many entries to skip and to return'),
        ])
      )
      .describe('Pagination parameters');
  }

  get filters() {
    return z.record(this.scalarFieldsEnum, z.any()).describe('Filters to apply to the query');
  }

  get data() {
    const { _scalarFields, _populatableFields, _schema } = this;

    const isWritableAttribute = ([attributeName]: [string, Schema.Attribute.AnyAttribute]) => {
      return contentTypes.isWritableAttribute(_schema, attributeName);
    };

    const entries = Object.entries({ ..._scalarFields, ..._populatableFields });

    return (
      entries
        // Remove non-writable attributes
        .filter(isWritableAttribute)
        // Combine schemas
        .reduce((acc, [attributeName, attribute]) => {
          return acc.extend({
            get [attributeName]() {
              return mapAttributeToInputSchema(attribute);
            },
          });
        }, z.object())
    );
  }

  get query() {
    return z.string();
  }

  get body() {
    return z.object({ data: this.data });
  }

  get partialBody() {
    return z.object({ data: this.data.partial() });
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
  queryParams(params: QueryParam[]): Partial<Record<QueryParam, z.Schema>> {
    const map: Record<QueryParam, () => z.Schema> = {
      fields: () => this.queryFields.optional(),
      populate: () => this.queryPopulate.optional(),
      sort: () => this.querySort.optional(),
      filters: () => this.filters.optional(),
      locale: () => this.locale.optional(),
      pagination: () => this.pagination.optional(),
      status: () => this.status.optional(),
      _q: () => this.query.optional(),
    } as const;

    return params.reduce(
      (acc, param) => ({ ...acc, [param]: map[param]() }),
      {} as Partial<Record<QueryParam, z.Schema>>
    );
  }
}
