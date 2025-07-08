/**
 * Route validation utilities for Strapi
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
export type { QueryParam } from './base';
export * from './query-params';
