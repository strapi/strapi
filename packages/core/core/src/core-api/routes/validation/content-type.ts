import type { Schema, UID } from '@strapi/types';

import { contentTypes } from '@strapi/utils';
import * as z from 'zod/v4';

// eslint-disable-next-line import/no-cycle
import { createAttributesInputSchema, createAttributesSchema } from './mappers';
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
 * Extends the base AbstractRouteValidator with schema-aware validation for Strapi content types.
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
 * // Validate query parameters with schema awareness
 * const querySchema = validator.queryParams(['fields', 'populate', 'sort']);
 * ```
 */
export class CoreContentTypeRouteValidator extends AbstractCoreRouteValidator<UID.ContentType> {
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
    const entries = Object.entries({ ...this._scalarFields, ...this._populatableFields });

    const sanitizedAttributes = entries
      // Remove passwords from the attribute list
      .filter(([, attribute]) => !['password'].includes(attribute.type));

    // Merge all attributes into a single schema
    const attributesSchema = createAttributesSchema(sanitizedAttributes);

    return z
      .object({
        documentId: this.documentID,
        id: z.union([z.string(), z.number()]),
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
   * Schema-aware fields validation that restricts to actual model fields
   */
  protected get schemaAwareQueryFields() {
    return this.scalarFieldsArray
      .readonly()
      .describe(
        `The fields to return, this doesn't include populatable fields like relations, components, files, or dynamic zones`
      );
  }

  /**
   * Schema-aware populate validation that restricts to actual populatable fields
   */
  protected get schemaAwareQueryPopulate() {
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
   * Schema-aware sort validation that restricts to actual model fields
   */
  protected get schemaAwareQuerySort() {
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

  /**
   * Schema-aware filters validation that restricts to actual model fields
   */
  protected get schemaAwareFilters() {
    return z.record(this.scalarFieldsEnum, z.any()).describe('Filters to apply to the query');
  }

  get locale() {
    return z.string().describe('Select a locale');
  }

  get status() {
    return z
      .enum(['draft', 'published'])
      .describe('Fetch documents based on their status. Default to "published" if not specified.');
  }

  get data() {
    const isWritableAttribute = ([attributeName]: [string, Schema.Attribute.AnyAttribute]) => {
      return contentTypes.isWritableAttribute(this._schema, attributeName);
    };

    const entries = Object.entries({ ...this._scalarFields, ...this._populatableFields });

    const sanitizedAttributes = entries
      // Remove non-writable attributes
      .filter(isWritableAttribute);

    return createAttributesInputSchema(sanitizedAttributes);
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
   * const querySchemas = validator.queryParams(['fields', 'populate']);
   * ```
   */
  queryParams(params: QueryParam[]): Partial<Record<QueryParam, z.Schema>> {
    const map: Record<QueryParam, () => z.Schema> = {
      fields: () => this.schemaAwareQueryFields.optional(),
      populate: () => this.schemaAwareQueryPopulate.optional(),
      sort: () => this.schemaAwareQuerySort.optional(),
      filters: () => this.schemaAwareFilters.optional(),
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
