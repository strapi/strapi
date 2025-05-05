import type { Core, UID } from '@strapi/types';
import { z } from 'zod';

import { AbstractCoreRouteValidator, mapAttributeToSchema } from './common';

/**
 * A component validator for core content-type routes.
 *
 * Provides validation schemas and utilities for handling component-specific validation in content-type routes.
 *
 * @example
 * ```ts
 * const strapi = // ... strapi instance
 * const uid = 'api::article.article'
 * const validator = new CoreComponentRouteValidator(strapi, uid);
 *
 * // Get validation schema for a component entry
 * const componentSchema = validator.component;
 * ```
 */
export class CoreComponentRouteValidator extends AbstractCoreRouteValidator<UID.Component> {
  /**
   * Creates a new instance of CoreComponentRouteValidator
   *
   * @param strapi - The Strapi instance
   * @param uid - The component's unique identifier
   */
  constructor(strapi: Core.Strapi, uid: UID.Component) {
    super(strapi, uid);
  }

  /**
   * Generates a comprehensive validation schema for a single component entry.
   *
   * Combines scalar fields and populatable fields into a single schema.
   *
   * @returns A schema for validating complete entries
   *
   * @example
   * ```ts
   * const validator = new CoreComponentRouteValidator(strapi, uid);
   * const entrySchema = validator.entry;
   * ```
   */
  get entry() {
    const { _scalarFields, _populatableFields } = this;

    const entries = Object.entries({ ..._scalarFields, ..._populatableFields });

    return entries.reduce((acc, [attributeName, attribute]) => {
      return acc.merge(z.object({ [attributeName]: mapAttributeToSchema(attribute) }));
    }, z.object({}));
  }
}
