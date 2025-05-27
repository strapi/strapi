/**
 * @file This file contains utility functions for working with Zod schemas.
 * It provides functions to modify schemas (e.g., make them optional, readonly, or add default values),
 * and to safely register and create schemas within Zod's global registry.
 */

import { z } from 'zod';

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
    return defaultValue !== undefined
      ? schema.default(typeof defaultValue === 'function' ? defaultValue() : defaultValue)
      : schema;
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
  return <R extends z.ZodString | z.ZodNumber | z.ZodArray<z.ZodAny>>(schema: R) => {
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

/**
 * Safely adds or updates a schema in Zod's global registry.
 *
 * If a schema with the given `id` already exists, it will be removed before adding the new one.
 *
 * This is useful for hot-reloading or preventing issues with cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in the global registry.
 * @param schema - The Zod schema to register.
 * @example
 * ```typescript
 * safeGlobalRegistrySet("mySchema", z.object({ name: z.string() }));
 * ```
 */
export const safeGlobalRegistrySet = (id: string, schema: z.ZodType) => {
  const { _idmap: idMap } = z.globalRegistry;

  // Allow safe overrides in the ID map
  if (idMap.has(id)) {
    idMap.delete(id);
  }

  z.globalRegistry.add(schema, { id });
};

/**
 * Safely creates and registers a Zod schema in the global registry, particularly useful for handling cyclical data structures.
 *
 * If a schema with the given `id` already exists in the global registry, it returns the existing schema.
 *
 * Otherwise, it registers a temporary `z.any()` schema, calls the provided `callback` to create the actual schema,
 * and then replaces the temporary schema with the actual one in the registry.
 *
 * This prevents infinite loops in cases of cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in the global registry.
 * @param callback - A function that returns the Zod schema to be created and registered.
 * @returns The created or retrieved Zod schema.
 * @example
 * ```typescript
 * const CategorySchema = safeSchemaCreation("Category", () =>
 *   z.object({
 *     name: z.string(),
 *     products: z.array(safeSchemaCreation("Product", () =>
 *       z.object({
 *         name: z.string(),
 *         category: z.lazy(() => CategorySchema) // Cyclical reference
 *       })
 *     ))
 *   })
 * );
 * ```
 */
export const safeSchemaCreation = (id: string, callback: () => z.ZodType) => {
  const { _idmap: idMap } = z.globalRegistry;

  const existsInGlobalRegistry = idMap.has(id);

  if (existsInGlobalRegistry) {
    return idMap.get(id) as z.ZodType;
  }

  // Temporary any placeholder before replacing with the actual schema type
  // Used to prevent infinite loops in cyclical data structures
  safeGlobalRegistrySet(id, z.any());

  const schema = callback();

  safeGlobalRegistrySet(id, schema);

  return schema;
};
