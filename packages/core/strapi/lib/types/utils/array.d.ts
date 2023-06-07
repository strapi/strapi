import type { Utils } from '@strapi/strapi';

/**
 * Extract the array values into an union type
 **/
export type Values<TCollection extends Array<unknown>> = TCollection extends Array<infer TValues>
  ? TValues
  : never;

/**
 * Checks if the size of the given collection equals 0
 */
export type IsEmpty<TCollection extends Array<unknown>> = Utils.Expression.Extends<
  TCollection['length'],
  0
>;

/**
 * Checks if the size of the given collection is not 0
 *
 * Returns a {@link Utils.Expression.Boolean} expression
 */
export type IsNotEmpty<TCollection extends Array<unknown>> = Utils.Expression.Not<
  IsEmpty<TCollection>
>;
