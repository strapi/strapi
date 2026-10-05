import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';

import { isManyRelationForMcp } from '../sanitizers/shape-relations';

const relationIdentity = z.object({
  documentId: z.string(),
  locale: z.string().optional(),
  __type: z.string().optional(),
  // Computed publish status preserved on `localizations` entries (calculate, then strip).
  status: z.string().optional(),
});

const buildAttributeSchema = (key: string, attributes: Struct.SchemaAttributes): z.ZodTypeAny => {
  const attribute = attributes[key];

  if (attribute?.type !== 'relation') {
    return z.unknown().optional();
  }

  // admin::user relations are out of scope — left as unknown
  if ((attribute as { target?: string }).target === 'admin::user') {
    return z.unknown().optional();
  }

  // Must match the runtime shaping cardinality (shape-relations.ts) — the MCP SDK
  // validates structuredContent against this schema, so a mismatch fails the tool call.
  if (isManyRelationForMcp(attribute as { relation?: string })) {
    return z.array(relationIdentity).optional();
  }

  return relationIdentity.nullable().optional();
};

const buildOutputDataSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields: Set<string> | null
): z.ZodTypeAny => {
  const readableKeys = Object.keys(attributes).filter(
    (key) => permittedFields === null || permittedFields.has(key)
  );

  if (readableKeys.length === 0) {
    return z.record(z.string(), z.unknown());
  }

  const shape = Object.fromEntries(
    readableKeys.map((key) => [key, buildAttributeSchema(key, attributes)])
  );

  return z.object(shape).loose();
};

/**
 * Builds the MCP output schema for a single-document response (`{ data, meta }`).
 * Field shape is constrained to `readFields` when non-null (RBAC field filtering).
 */
export const buildDocumentOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      data: buildOutputDataSchema(attributes, readFields).nullable(),
      meta: z
        .object({
          availableLocales: z.array(z.record(z.string(), z.unknown())).optional(),
          availableStatus: z.array(z.record(z.string(), z.unknown())).optional(),
        })
        .optional(),
    })
    .loose();

/**
 * Builds the MCP output schema for a paginated list response (`{ results, pagination }`).
 * Field shape is constrained to `readFields` when non-null (RBAC field filtering).
 */
export const buildListOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      results: z.array(buildOutputDataSchema(attributes, readFields)),
      pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        pageCount: z.number(),
        total: z.number(),
      }),
    })
    .loose();

/**
 * Builds the MCP output schema for a delete response (`{ data }`).
 * Delete handlers return an empty data object, so do not require document relation fields.
 */
export const buildDeleteOutputSchema = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _attributes: Struct.SchemaAttributes,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      data: z.object({}).loose().nullable(),
    })
    .loose();
