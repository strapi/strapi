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
 * Relations are inlined as full (RBAC-sanitized) entries as deep as the populate spec
 * asks — e.g. `{ author: { populate: ["avatar"] } }` inlines `author` and `author.avatar`.
 * Relations not covered by the spec are returned as `{ documentId }` identity stubs.
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
  // standard Strapi nested query shape ({ fields, populate, filters, sort }); a nested
  // `populate` drives inlining of that deeper relation (see buildInlinePathMatcher).
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
        `Relations are inlined as full entries (each sanitized against the related type's own read ` +
        `permissions) as deep as the spec asks — e.g. { author: { populate: ["avatar"] } } inlines ` +
        `author and author.avatar. Relations not covered by the spec are returned as { documentId } stubs.`
    );
};

/** Predicate + presence flag for opt-in, request-driven relation inlining. */
export type InlinePathMatcher = {
  /** True when the relation at this dotted attribute path (e.g. "author.avatar") should be inlined. */
  shouldInline: (attributePath: string | null | undefined) => boolean;
  /** True when the populate spec requested any inlining at all. */
  hasAny: boolean;
};

const joinPath = (prefix: string, key: string): string =>
  prefix === '' ? key : `${prefix}.${key}`;

const parentPath = (path: string): string => {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(0, index);
};

/**
 * Builds a matcher describing which relation paths an incoming `populate` value opts into
 * inlining — driven by the populate spec itself, so inline depth follows the request:
 *
 *   - `["author"]`                         → inline `author` (one level)
 *   - `{ author: { populate: ["avatar"] }}`→ inline `author` AND `author.avatar`
 *   - `{ seo: { populate: "*" } }`         → inline any relation directly under `seo`
 *   - `"*"`                                → inline any relation one level under the root
 *
 * Matching is by dotted attribute path; whether a matched path is actually a relation (vs a
 * component/media) is decided at shaping time. Returns `hasAny: false` when `populate` is
 * absent, so default behavior (all relations stubbed) is preserved and inlining stays opt-in.
 */
export const buildInlinePathMatcher = (populate: unknown): InlinePathMatcher => {
  const exact = new Set<string>();
  const wildcard = new Set<string>();

  const collect = (node: unknown, prefix: string): void => {
    if (node === undefined || node === null || node === false) {
      return;
    }
    if (node === '*') {
      wildcard.add(prefix);
      return;
    }
    if (Array.isArray(node)) {
      for (const key of node) {
        if (typeof key === 'string') exact.add(joinPath(prefix, key));
      }
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (value === false || value === undefined || value === null) {
          // eslint-disable-next-line no-continue
          continue;
        }
        const path = joinPath(prefix, key);
        exact.add(path);
        if (typeof value === 'object' && !Array.isArray(value) && 'populate' in value) {
          collect((value as { populate?: unknown }).populate, path);
        }
      }
    }
  };

  collect(populate, '');

  const shouldInline = (attributePath: string | null | undefined): boolean => {
    if (attributePath === null || attributePath === undefined || attributePath === '') {
      return false;
    }
    return exact.has(attributePath) === true || wildcard.has(parentPath(attributePath)) === true;
  };

  return { shouldInline, hasAny: exact.size > 0 || wildcard.size > 0 };
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
