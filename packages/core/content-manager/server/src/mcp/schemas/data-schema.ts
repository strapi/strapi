import { contentTypes, z } from '@strapi/utils';
import type { Core, Schema, Struct } from '@strapi/types';

import { buildBlocksInputSchema } from './blocks-schema';
import type { ContentManagerModelForMcp } from '../types';

type CustomFieldAttribute = {
  type: 'customField';
  customField: string;
  [key: string]: unknown;
};

const isCustomFieldAttribute = (attr: unknown): attr is CustomFieldAttribute =>
  typeof attr === 'object' &&
  attr !== null &&
  (attr as Record<string, unknown>).type === 'customField' &&
  typeof (attr as Record<string, unknown>).customField === 'string';

/**
 * Builds a structured Zod object schema for a Strapi component UID.
 * Declared as a regular function so it is hoisted above `attributeToInputSchema`
 * — the two functions are mutually recursive (component attrs recurse into
 * attributeToInputSchema; attributeToInputSchema calls this for 'component' cases).
 *
 * @param strapi - Strapi instance (components registry available post-load).
 * @param componentUid - e.g. "common.seo".
 * @param visited - cycle-guard; prevents infinite recursion on self-referencing components.
 */
export function buildComponentInputSchema(
  strapi: Core.Strapi,
  componentUid: string,
  visited: Set<string> = new Set()
): z.ZodTypeAny {
  if (visited.has(componentUid) === true) {
    // Circular reference — fall back to permissive but non-empty JSON Schema
    return z.record(z.string(), z.unknown());
  }

  type ComponentEntry = { attributes: Record<string, Schema.Attribute.AnyAttribute> };
  const componentsMap = strapi.components as unknown as Record<string, ComponentEntry | undefined>;
  const component = componentsMap[componentUid];
  if (component === undefined) {
    return z.record(z.string(), z.unknown());
  }

  visited.add(componentUid);

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, attr] of Object.entries(component.attributes)) {
    if (key === 'id') {
      // eslint-disable-next-line no-continue
      continue;
    }
    shape[key] = attributeToInputSchema(strapi, attr, visited);
  }

  visited.delete(componentUid);

  return z.object(shape).strict();
}

/**
 * Maps a single Strapi attribute to a Zod input schema, carrying constraints
 * (min, max, minLength, maxLength, required, enum values, etc.).
 *
 * Mirrors the `mapAttributeToInputSchema` logic from
 * `packages/core/core/src/core-api/routes/validation/mappers.ts` — kept inline
 * here to avoid a cross-package import from @strapi/content-manager into
 * @strapi/core (which is not a listed dependency).
 *
 * TODO — custom fields call `strapi.get('custom-fields')` at schema-build
 * time; confirm with an integration test that the registry is populated when MCP
 * tools are registered (post-bootstrap).
 */
export const attributeToInputSchema = (
  strapi: Core.Strapi,
  attr: Schema.Attribute.AnyAttribute,
  visited: Set<string> = new Set()
): z.ZodTypeAny => {
  switch (attr.type) {
    case 'string':
    case 'text':
    case 'richtext':
    case 'password': {
      const { required, minLength, maxLength } = attr as Schema.Attribute.String;
      let s: z.ZodString = z.string();
      if (minLength !== undefined) s = s.min(minLength);
      if (maxLength !== undefined) s = s.max(maxLength);
      return required === true ? s : s.optional();
    }
    case 'email': {
      const { required } = attr as Schema.Attribute.Email;
      const s = z.string().email();
      return required === true ? s : s.optional();
    }
    case 'uid': {
      const { required } = attr as Schema.Attribute.UID;
      const s = z.string();
      return required === true ? s : s.optional();
    }
    case 'integer': {
      const { required, min, max } = attr as Schema.Attribute.Integer;
      let s = z.number().int();
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return required === true ? s : s.optional();
    }
    case 'biginteger': {
      const { required } = attr as Schema.Attribute.BigInteger;
      const s = z.string();
      return required === true ? s : s.optional();
    }
    case 'decimal':
    case 'float': {
      const { required, min, max } = attr as Schema.Attribute.Decimal;
      let s = z.number();
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return required === true ? s : s.optional();
    }
    case 'boolean': {
      const { required } = attr as Schema.Attribute.Boolean;
      const s = z.boolean();
      return required === true ? s : s.optional();
    }
    case 'date':
    case 'datetime':
    case 'time':
    case 'timestamp': {
      const { required } = attr as Schema.Attribute.Date;
      const s = z.string();
      return required === true ? s : s.optional();
    }
    case 'enumeration': {
      const { required, enum: values } = attr as Schema.Attribute.Enumeration<string[]>;
      if (Array.isArray(values) && values.length > 0) {
        const s = z.enum(values as [string, ...string[]]);
        return required === true ? s : s.optional();
      }
      const s = z.string();
      return required === true ? s : s.optional();
    }
    case 'json': {
      const { required } = attr as Schema.Attribute.JSON;
      const s = z.any();
      return required === true ? s : s.optional();
    }
    case 'blocks': {
      const { required } = attr as Schema.Attribute.Blocks;
      const s = buildBlocksInputSchema();
      return required === true ? s : s.optional();
    }
    case 'component': {
      // Cast to a plain record to avoid generic defaults on `repeatable` (Constants.False)
      const componentAttr = attr as unknown as {
        required?: boolean;
        repeatable?: boolean;
        component?: string;
        min?: number;
        max?: number;
      };
      const componentUid = componentAttr.component;
      const componentSchema: z.ZodTypeAny =
        componentUid !== undefined
          ? buildComponentInputSchema(strapi, componentUid, visited)
          : z.record(z.string(), z.unknown());

      let s: z.ZodTypeAny =
        componentAttr.repeatable === true ? z.array(componentSchema) : componentSchema;
      if (componentAttr.repeatable === true && componentAttr.min !== undefined) {
        s = (s as z.ZodArray<z.ZodTypeAny>).min(componentAttr.min);
      }
      if (componentAttr.repeatable === true && componentAttr.max !== undefined) {
        s = (s as z.ZodArray<z.ZodTypeAny>).max(componentAttr.max);
      }
      return componentAttr.required === true ? s : s.optional();
    }
    case 'dynamiczone': {
      const dzAttr = attr as unknown as { required?: boolean; min?: number; max?: number };
      let s = z.array(z.any());
      if (dzAttr.min !== undefined) s = (s as z.ZodArray<z.ZodAny>).min(dzAttr.min);
      if (dzAttr.max !== undefined) s = (s as z.ZodArray<z.ZodAny>).max(dzAttr.max);
      return dzAttr.required === true ? s : s.optional();
    }
    case 'media': {
      const mediaAttr = attr as unknown as { required?: boolean; multiple?: boolean };
      const s = mediaAttr.multiple === true ? z.array(z.any()) : z.any();
      return mediaAttr.required === true ? s : s.optional();
    }
    case 'relation': {
      const relAttr = attr as Schema.Attribute.Relation;
      const isToMany = relAttr.relation?.endsWith('ToMany') === true;

      const relDocumentId = z
        .string()
        .min(1)
        .describe('Strapi document ID (e.g. "z7v8zma53x01r6oceimv922b").');

      const relLongHand = z
        .object({
          documentId: relDocumentId,
          locale: z
            .string()
            .optional()
            .describe('Target locale. Defaults to source document locale.'),
          status: z
            .enum(['draft', 'published'])
            .optional()
            .describe('Target version status. Defaults based on draftAndPublish config.'),
        })
        .strict();

      let s: z.ZodTypeAny;

      if (isToMany === true) {
        const relEntry = z.union([relDocumentId, relLongHand]);

        const relConnectPosition = z
          .object({
            before: z.string().optional().describe('Document ID to insert before.'),
            after: z.string().optional().describe('Document ID to insert after.'),
            start: z.boolean().optional().describe('Insert at start of list.'),
            end: z.boolean().optional().describe('Insert at end of list (default).'),
          })
          .strict();

        const relConnectEntry = z
          .object({
            documentId: relDocumentId,
            locale: z.string().optional(),
            status: z.enum(['draft', 'published']).optional(),
            position: relConnectPosition
              .optional()
              .describe('Ordering hint. Default: { end: true }.'),
          })
          .strict();

        s = z
          .object({
            connect: z
              .array(z.union([relDocumentId, relConnectEntry]))
              .optional()
              .describe(
                'Add relations. Each entry: documentId string, or { documentId, locale?, status?, position? }.'
              ),
            disconnect: z
              .array(relEntry)
              .optional()
              .describe(
                'Remove relations. Each entry: documentId string, or { documentId, locale?, status? }.'
              ),
            set: z
              .union([z.array(relEntry), z.null()])
              .optional()
              .describe(
                'Replace all relations. Array replaces existing; null clears all. Mutually exclusive with connect/disconnect.'
              ),
          })
          .strict();
      } else {
        s = z.union([
          relDocumentId,
          relLongHand,
          z.null().describe('Set to null to clear the relation.'),
        ]);
      }

      return relAttr.required === true ? s : s.optional();
    }
    default: {
      const unknownAttr: unknown = attr;
      if (isCustomFieldAttribute(unknownAttr)) {
        const customField = strapi.get('custom-fields').get(unknownAttr.customField);
        if (customField !== undefined) {
          return attributeToInputSchema(
            strapi,
            {
              ...unknownAttr,
              type: customField.type,
            } as unknown as Schema.Attribute.AnyAttribute,
            visited
          );
        }
      }
      return z.unknown();
    }
  }
};

/**
 * Derives a per-content-type `data` Zod schema from the model's writable attributes.
 * Uses `contentTypes.isWritableAttribute` to filter system-managed keys
 * (id, documentId, timestamps, createdBy, updatedBy, localizations, locale, etc.).
 * Unknown keys are rejected (strict mode) — invalid field names fail at the MCP boundary.
 */
export const buildDataSchema = (
  strapi: Core.Strapi,
  schema: Struct.ContentTypeSchema | ContentManagerModelForMcp,
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null
): z.ZodTypeAny => {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, attr] of Object.entries(attributes)) {
    // For component attributes, skip the permittedFields check.
    // Permission check happens at the component level (parent key),
    // not at the sub-field level. Using permittedFields here causes
    // a mismatch: the schema includes all sub-fields (because the parent
    // key is permitted), but sanitizeCreateInput() then removes
    // sub-fields that the user cannot write to individually.
    // See: https://github.com/strapi/strapi/issues/26509
    const isComponent = (attr as { type?: string }).type === 'component';
    const isPermitted =
      isComponent || // Always include component attributes (permission checked at parent level)
      permittedFields === null ||
      permittedFields === undefined ||
      permittedFields.has(key) === true;

    if (
      isPermitted === true &&
      contentTypes.isWritableAttribute(schema as Struct.ContentTypeSchema, key) === true &&
      contentTypes.isPrivateAttribute(schema as Struct.ContentTypeSchema, key) !== true
    ) {
      shape[key] = attributeToInputSchema(strapi, attr);
    }
  }

  return z.object(shape).strict().describe('Document field values to write.');
};
