/**
 * @file This file contains utility functions for working with Zod schemas.
 * It provides functions to modify schemas (e.g., make them optional, readonly, or add default values),
 * and to safely register and create schemas within Zod's global registry.
 */

import * as z from 'zod/v4';

/**
 * Transforms a Strapi UID into an OpenAPI-compliant component name.
 *
 * @param uid - The Strapi UID to transform (e.g., "basic.seo", "api::category.category", "plugin::upload.file")
 * @returns The OpenAPI-compliant component name (e.g., "BasicSeoEntry", "ApiCategoryCategoryDocument", "PluginUploadFileDocument")
 */
export const transformUidToValidOpenApiName = (uid: string): string => {
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const toPascalCase = (str: string): string => {
    return str.split(/[-_]/).map(capitalize).join('');
  };

  // Check if it contains double colons (other namespaced UIDs)
  if (uid.includes('::')) {
    const [namespace, ...rest] = uid.split('::');
    const namespacePart = toPascalCase(namespace);
    const restParts = rest.join('.').split('.').map(toPascalCase).map(capitalize);
    return `${capitalize(namespacePart)}${restParts.join('')}Document`;
  }

  if (uid.includes('.')) {
    // basic.seo -> BasicSeoEntry
    const parts = uid.split('.');
    const transformedParts = parts.map(toPascalCase).map(capitalize);
    return `${transformedParts.join('')}Entry`;
  }

  return `${toPascalCase(capitalize(uid))}Schema`;
};

/**
 * Conditionally makes a Zod schema optional based on the `required` parameter.
 *
 * @param required - If `false` or `undefined`, the schema will be made optional. If `true`, the schema becomes non-optional.
 * @returns A function that takes a Zod schema and returns a modified schema (optional or required).
 * @example
 * ```typescript
 * const optionalString = maybeRequired(false)(z.string()); // z.ZodOptional<z.ZodString>
 *
 * const requiredString = maybeRequired(true)(z.string());  // z.ZodString
 * ```
 */
export const maybeRequired = (required?: boolean) => {
  return <T extends z.Schema>(schema: T) => {
    return required !== true ? schema.optional() : schema.nonoptional();
  };
};

/**
 * Conditionally makes a Zod schema readonly based on the `writable` parameter.
 *
 * @param writable - If `false`, the schema will be made readonly. If `true` or `undefined`, the schema remains unchanged.
 * @returns A function that takes a Zod schema and returns a modified schema (readonly or original).
 * @example
 * ```typescript
 * const readonlyNumber = maybeReadonly(false)(z.number()); // z.ZodReadonly<z.ZodNumber>
 * const writableNumber = maybeReadonly(true)(z.number());  // z.ZodNumber
 * ```
 */
export const maybeReadonly = (writable?: boolean) => {
  return <T extends z.Schema>(schema: T) => (writable !== false ? schema : schema.readonly());
};

/**
 * Conditionally adds a default value to a Zod schema based on the `defaultValue` parameter.
 *
 * @param defaultValue - The default value to apply to the schema. If `undefined`, no default value is added.
 *                       If `defaultValue` is a function, its return value will be used as the default.
 * @returns A function that takes a Zod schema and returns a modified schema (with default or original).
 * @example
 * ```typescript
 * const stringWithDefault = maybeWithDefault("default")(z.string()); // z.ZodDefault<z.ZodString>
 * const numberWithFunctionDefault = maybeWithDefault(() => Math.random())(z.number());
 * ```
 */
export const maybeWithDefault = (defaultValue?: unknown) => {
  return <T extends z.Schema>(schema: T) => {
    if (defaultValue === undefined) {
      return schema;
    }

    const value = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    return schema.default(value);
  };
};

/**
 * Conditionally applies `min` and `max` constraints to a Zod string, number, or array schema.
 *
 * @param min - The minimum value/length. If `undefined`, no minimum constraint is applied.
 * @param max - The maximum value/length. If `undefined`, no maximum constraint is applied.
 * @returns A function that takes a Zod string, number, or array schema and returns a modified schema (with min/max constraints or original).
 * @example
 * ```typescript
 * const stringWithMinMax = maybeWithMinMax(5, 10)(z.string()); // z.ZodString with min(5) and max(10)
 * const numberWithMinMax = maybeWithMinMax(0, 100)(z.number()); // z.ZodNumber with min(0) and max(100)
 * ```
 */
export const maybeWithMinMax = (min?: number, max?: number) => {
  return <R extends z.ZodString | z.ZodEmail | z.ZodNumber | z.ZodArray<z.ZodAny>>(schema: R) => {
    return min !== undefined && max !== undefined ? schema.min(min).max(max) : schema;
  };
};

/**
 * Applies a series of modifier functions to a Zod schema sequentially.
 *
 * @template T - The type of the Zod schema.
 * @param schema - The initial Zod schema to which modifiers will be applied.
 * @param modifiers - An array of functions, each taking a Zod schema and returning a modified schema.
 * @returns The final Zod schema after all modifiers have been applied.
 * @example
 * ```typescript
 * const modifiedSchema = augmentSchema(z.string(), [
 *   maybeRequired(false),
 *   maybeWithDefault("test")
 * ]);
 * ```
 */
export const augmentSchema = <T extends z.Schema>(
  schema: T,
  modifiers: ((schema: T) => z.Schema)[]
) => {
  return modifiers.reduce((acc, modifier) => modifier(acc) as T, schema);
};
