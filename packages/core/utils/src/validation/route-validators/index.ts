/**
 * Route validation utilities for Strapi
 *
 * This module provides route validation that can be used across different
 * packages & plugins.
 *
 * The utilities are designed to work both standalone (for generic validation) and
 * as building blocks for more sophisticated schema-aware validation via @strapi/core.
 *
 * @example
 * ```typescript
 * import { AbstractRouteValidator, type QueryParam } from '@strapi/utils';
 * import * as z from 'zod/v4';
 *
 * export class MyPluginRouteValidator extends AbstractRouteValidator {
 *   constructor(strapi: Core.Strapi) {
 *     super();
 *   }
 *
 *   // Add custom validators for your plugin
 *   get myEntity() {
 *     return z.object({
 *       id: z.number(),
 *       name: z.string(),
 *       // ... other fields
 *     });
 *   }
 *
 *   // Use inherited query parameter validators
 *   // In your routes:
 *   // request: {
 *   //   query: validator.queryParams(['fields', 'populate', 'sort', 'pagination'])
 *   // }
 * }
 * ```
 */

export { AbstractRouteValidator } from './base';
export * from './query-params';
