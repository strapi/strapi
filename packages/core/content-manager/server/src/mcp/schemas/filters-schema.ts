import { z } from '@strapi/utils';
import type { Schema, Struct } from '@strapi/types';
import { getScalarAttributeKeys } from './sort-schema';

/**
 * Maps a scalar Strapi attribute type to the appropriate Zod leaf value schema
 * used inside filter operator objects (e.g. { $eq: <value> }).
 */
export const attributeTypeToFilterValue = (attr: Schema.Attribute.AnyAttribute): z.ZodTypeAny => {
  switch (attr.type) {
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      return z.union([z.number(), z.array(z.number())]);
    case 'boolean':
      return z.boolean();
    case 'enumeration': {
      const enumAttr = attr as Schema.Attribute.Enumeration<string[]>;
      if (Array.isArray(enumAttr.enum) && enumAttr.enum.length > 0) {
        return z.union([
          z.enum(enumAttr.enum as [string, ...string[]]),
          z.array(z.enum(enumAttr.enum as [string, ...string[]])),
        ]);
      }
      return z.union([z.string(), z.array(z.string())]);
    }
    default:
      // string, text, richtext, email, password, uid, date, datetime, time, timestamp
      return z.union([z.string(), z.array(z.string()), z.null()]);
  }
};

/** All supported Strapi filter operators (excludes the experimental `$jsonSupersetOf`). */
export const FILTER_OPERATORS = [
  '$eq',
  '$eqi',
  '$ne',
  '$nei',
  '$in',
  '$notIn',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$between',
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
  '$startsWith',
  '$startsWithi',
  '$endsWith',
  '$endsWithi',
  '$null',
  '$notNull',
] as const;

/**
 * Builds a per-content-type recursive filters Zod schema.
 *
 * Shape:
 *   - Logical operators: $and, $or accept an array of filter objects.
 *   - Logical operator: $not accepts a single filter object.
 *   - Field keys (scalar attrs only): accept either a direct value (implicit $eq)
 *     or an operator object { $eq, $contains, $gt, … }.
 *
 * If the model has no scalar attributes, the schema is z.never() (filters not allowed).
 */
export const buildFiltersSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const scalarKeys = getScalarAttributeKeys(attributes, permittedFields);

  if (scalarKeys.length === 0) {
    return z.never();
  }

  // Lazy reference for recursion ($and / $or / $not)
  const filtersSchema: z.ZodTypeAny = z.lazy(() => {
    const fieldShapes: Record<string, z.ZodTypeAny> = {};

    for (const key of scalarKeys) {
      const attr = attributes[key];
      const valueSchema = attributeTypeToFilterValue(attr);
      const operatorObject = z.object(
        Object.fromEntries(FILTER_OPERATORS.map((op) => [op, valueSchema.optional()]))
      );
      // Field accepts either a direct value (implicit $eq) or operator object
      fieldShapes[key] = z.union([valueSchema, operatorObject]).optional();
    }

    return z
      .object({
        $and: z.array(filtersSchema).optional(),
        $or: z.array(filtersSchema).optional(),
        $not: filtersSchema.optional(),
        ...fieldShapes,
      })
      .strict();
  });

  return filtersSchema
    .optional()
    .describe(
      `Filter object. Supports logical operators ($and, $or, $not) and field operators ` +
        `($eq, $ne, $in, $contains, $gt, $lt, etc.). Valid fields: ${scalarKeys.join(', ')}.`
    );
};
