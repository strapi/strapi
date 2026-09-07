import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';

import { getProjectableAttributeKeys } from './sort-schema';

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
 * Builds the `fields` Zod schema constrained to the model's readable projectable attributes.
 *
 * Accepts either:
 *   - `"*"`     — all projectable fields (Strapi wildcard notation),
 *   - `string[]`— an explicit subset of projectable field names.
 *
 * Mirrors Strapi's entityService/documents `fields` query parameter, which includes `json`
 * and `blocks` alongside plain scalars (unlike sort/filter eligibility). Constraining the
 * enum to permitted keys keeps RBAC field filtering intact. Returns `z.never()` when the
 * model exposes no readable projectable fields.
 */
export const buildFieldsSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const projectableKeys = getProjectableAttributeKeys(attributes, permittedFields);

  if (projectableKeys.length === 0) {
    // No readable projectable fields — keep the param present but reject any value.
    return z.never().optional();
  }

  return z
    .union([z.literal('*'), z.array(z.enum(projectableKeys as [string, ...string[]]))])
    .optional()
    .describe(
      `Scalar fields to return. "*" for all, or a subset: [${projectableKeys.join(', ')}]. ` +
        `Relations/components/media are controlled separately via "populate". ` +
        `When omitted, all readable fields are returned.`
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
 *   - `{ blocks: { on: { 'shared.hero': { populate: ["author"] } } } }` → inline `blocks.author`
 *     (dynamic-zone/morph fragments under `on` are collected against their parent's path,
 *     since runtime relation paths never include the component UID segment)
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
        if (typeof value === 'object' && !Array.isArray(value)) {
          const nestedSpecValue = value as { populate?: unknown; on?: unknown };
          if ('populate' in nestedSpecValue) {
            collect(nestedSpecValue.populate, path);
          }
          // Dynamic-zone/morph fragments nest per-component-type under `on`. Their runtime
          // populate paths never include the component UID segment (e.g.
          // `blocks.on['shared.hero'].populate.author` matches runtime path `blocks.author`),
          // so each fragment's `populate` is collected against the SAME path as its parent.
          if (typeof nestedSpecValue.on === 'object' && nestedSpecValue.on !== null) {
            for (const fragment of Object.values(nestedSpecValue.on as Record<string, unknown>)) {
              if (typeof fragment === 'object' && fragment !== null && 'populate' in fragment) {
                collect((fragment as { populate?: unknown }).populate, path);
              }
            }
          }
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
