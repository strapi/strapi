import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';

import { getScalarAttributeKeys } from './sort-schema';

/** Attribute types that can be populated (relations, components, dynamic zones, media). */
export const POPULATABLE_ATTRIBUTE_TYPES = new Set([
  'relation',
  'component',
  'dynamiczone',
  'media',
]);

/**
 * Returns the list of populatable attribute keys from a content type's attributes.
 * Scalars are excluded (they are always returned / controlled via `fields`). Private
 * attributes and — when `permittedFields` is provided — non-permitted attributes are
 * filtered out so `populate` can never widen RBAC field access.
 */
export const getPopulatableAttributeKeys = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): string[] => {
  let keys = Object.entries(attributes)
    .filter(
      ([, attr]) =>
        POPULATABLE_ATTRIBUTE_TYPES.has(attr.type) &&
        (attr as { private?: boolean }).private !== true
    )
    .map(([key]) => key);

  if (permittedFields !== null && permittedFields !== undefined) {
    keys = keys.filter((key) => permittedFields.has(key));
  }

  return keys;
};

/**
 * Builds the `fields` Zod schema constrained to the model's readable scalar attributes.
 *
 * Accepts either:
 *   - `"*"`     — all scalar fields (Strapi wildcard notation),
 *   - `string[]`— an explicit subset of scalar field names.
 *
 * Mirrors Strapi's entityService/documents `fields` query parameter. Constraining the
 * enum to permitted scalar keys keeps RBAC field filtering intact. Returns `z.never()`
 * when the model exposes no readable scalar fields.
 */
export const buildFieldsSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const scalarKeys = getScalarAttributeKeys(attributes, permittedFields);

  if (scalarKeys.length === 0) {
    // No readable scalar fields — keep the param present but reject any value.
    return z.never().optional();
  }

  return z
    .union([z.literal('*'), z.array(z.enum(scalarKeys as [string, ...string[]]))])
    .optional()
    .describe(
      `Scalar fields to return. "*" for all, or a subset: [${scalarKeys.join(', ')}]. ` +
        `Relations/components/media are controlled separately via "populate". ` +
        `When omitted, all readable scalar fields are returned.`
    );
};

/**
 * Builds the `populate` Zod schema constrained to the model's populatable attributes
 * (relations, components, dynamic zones, media).
 *
 * Accepts (mirroring Strapi's entityService/documents `populate` parameter):
 *   - `"*"`     — populate every populatable attribute one level deep,
 *   - `string[]`— an explicit subset of populatable attribute names,
 *   - object    — `{ <attr>: true | { fields?, populate?, filters?, sort? } }` for
 *                 finer-grained control per attribute.
 *
 * Only relations named directly on this content type are inlined as full (RBAC-sanitized)
 * entries; deeper/nested relations are returned as `{ documentId }` identity stubs.
 * Returns `z.never()` when the model has no populatable attributes.
 */
export const buildPopulateSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const populatableKeys = getPopulatableAttributeKeys(attributes, permittedFields);

  if (populatableKeys.length === 0) {
    // Nothing populatable on this model — keep the param present but reject any value.
    return z.never().optional();
  }

  const keyEnum = z.enum(populatableKeys as [string, ...string[]]);

  // Nested populate spec for a single attribute. Kept loose so callers can pass the
  // standard Strapi nested query shape ({ fields, populate, filters, sort }) — nested
  // values beyond the first relation level are still reduced to identity stubs at output.
  const nestedSpec = z
    .object({
      fields: z.union([z.literal('*'), z.array(z.string())]).optional(),
      populate: z
        .union([z.literal('*'), z.array(z.string()), z.record(z.string(), z.unknown())])
        .optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
      sort: z
        .union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())])
        .optional(),
    })
    .loose();

  // Per-key-optional object (a partial record) — constrains keys to populatable attrs while
  // still allowing any subset. A plain z.record with an enum key would require every key.
  const objectForm = z
    .object(
      Object.fromEntries(
        populatableKeys.map((key) => [key, z.union([z.boolean(), nestedSpec]).optional()])
      )
    )
    .strict();

  return z
    .union([z.literal('*'), z.array(keyEnum), objectForm])
    .optional()
    .describe(
      `Relations/components/media to populate. "*" for all one level deep, a subset ` +
        `[${populatableKeys.join(', ')}], or an object { <attr>: true | { fields, populate, filters, sort } }. ` +
        `Relations named directly on this type are inlined as full entries (sanitized against ` +
        `the related type's own read permissions); deeper relations are returned as { documentId } stubs. ` +
        `When omitted, relations are returned as { documentId } stubs.`
    );
};

/**
 * Derives the set of top-level relation attribute keys that an incoming `populate`
 * value requests inlining for. Only relation attributes (not components/media/dynamic
 * zones) are eligible — those are the entries reduced to `{ documentId }` stubs by
 * default. Returns an empty set when `populate` is absent, so default behavior (all
 * relations stubbed) is preserved and inlining is strictly opt-in.
 */
export const extractInlineRelationKeys = (
  populate: unknown,
  attributes: Struct.SchemaAttributes | undefined
): Set<string> => {
  if (populate === undefined || populate === null || attributes === undefined) {
    return new Set();
  }

  const relationKeys = new Set(
    Object.entries(attributes)
      .filter(
        ([, attr]) => attr.type === 'relation' && (attr as { private?: boolean }).private !== true
      )
      .map(([key]) => key)
  );

  if (populate === '*') {
    return relationKeys;
  }

  if (Array.isArray(populate)) {
    return new Set(
      populate.filter((key): key is string => typeof key === 'string' && relationKeys.has(key))
    );
  }

  if (typeof populate === 'object') {
    const requested = Object.entries(populate as Record<string, unknown>)
      .filter(([key, value]) => relationKeys.has(key) && value !== false && value !== undefined)
      .map(([key]) => key);
    return new Set(requested);
  }

  return new Set();
};

/**
 * Guard for the response-size budget. Defaults to 1 MB; overridable via
 * `server.mcp.maxResponseBytes`. Values <= 0 disable the guard.
 */
export const buildMaxDepthSchema = (): z.ZodTypeAny =>
  z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .describe(
      'Max relation-population depth for auto-populate (when "populate" is omitted). ' +
        'Lower values keep responses small. Ignored when "populate" is provided.'
    );
