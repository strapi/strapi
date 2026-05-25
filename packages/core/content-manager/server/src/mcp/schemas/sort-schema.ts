import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';

/** Attribute types considered scalar for sorting and filtering (excludes relations, components, media, json, blocks). */
export const SCALAR_ATTRIBUTE_TYPES = new Set([
  'string',
  'text',
  'richtext',
  'email',
  'password',
  'uid',
  'integer',
  'biginteger',
  'decimal',
  'float',
  'boolean',
  'date',
  'datetime',
  'time',
  'timestamp',
  'enumeration',
]);

/**
 * Returns the list of scalar attribute keys from a content type's attributes.
 * Relation, component, dynamiczone, media, json, and blocks are excluded because
 * they cannot be meaningfully sorted or filtered via simple operators.
 */
export const getScalarAttributeKeys = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): string[] => {
  let keys = Object.entries(attributes)
    .filter(
      ([, attr]) =>
        SCALAR_ATTRIBUTE_TYPES.has(attr.type) && (attr as { private?: boolean }).private !== true
    )
    .map(([key]) => key);

  if (permittedFields !== null && permittedFields !== undefined) {
    keys = keys.filter((key) => permittedFields.has(key));
  }

  return keys;
};

/**
 * Builds a per-content-type sort Zod schema constrained to the model's scalar fields.
 *
 * Supports all four Strapi sort notations:
 *   - string:        "title:asc"
 *   - string[]:      ["title:asc", "createdAt:desc"]
 *   - object:        { title: "asc" }
 *   - object[]:      [{ title: "asc" }, { createdAt: "desc" }]
 *
 * Object forms have their keys constrained to known scalar attribute names.
 * If the model has no scalar attributes, the schema is z.never() (sort not allowed).
 */
export const buildSortSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const scalarKeys = getScalarAttributeKeys(attributes, permittedFields);

  if (scalarKeys.length === 0) {
    return z.never();
  }

  const directionSchema = z.enum(['asc', 'desc']);
  const sortObjectSchema = z
    .object(Object.fromEntries(scalarKeys.map((key) => [key, directionSchema.optional()])))
    .strict();

  const sortStringPattern = /^([^:]+):(asc|desc)$/;
  const isPermittedSortString = (value: string): boolean => {
    const match = sortStringPattern.exec(value);
    if (match === null) {
      return true;
    }
    return scalarKeys.includes(match[1]);
  };

  const stringSortSchema = z.string().refine(isPermittedSortString, {
    message: `Sort field must be one of: ${scalarKeys.join(', ')}`,
  });

  return z
    .union([
      stringSortSchema,
      z.array(stringSortSchema),
      sortObjectSchema,
      z.array(sortObjectSchema),
    ])
    .optional()
    .describe(
      `Sort expression. String: "field:asc". Array: ["field:asc"]. Object: { field: "asc" }. ` +
        `Valid fields: ${scalarKeys.join(', ')}.`
    );
};
