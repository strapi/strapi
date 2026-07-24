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
 * Controls how the required constraint is projected onto the emitted Zod schema.
 *
 * - `lenient` — create on a draft-and-publish model. MCP create always resolves to a
 *   draft, and draft writes skip required validation entirely (both server-side in the
 *   entity validator and admin-side), so hard-gating required fields here would make MCP
 *   stricter than the admin panel. When set, required scalars/components become optional
 *   with an explanatory hint instead of being rejected outright.
 * - `partial` — update writes. REST/admin updates are partial and the entity validator
 *   does not treat omitted fields as missing, so every attribute becomes optional.
 *   Required attributes still carry the explanatory hint so agents can tell required
 *   fields apart from optional ones even when nothing is hard-gated.
 *
 * Both flags propagate recursively through components and the custom-field redispatch so
 * required scalars *inside* components follow the same rule as top-level ones.
 *
 * Relations and media are never hard-gated regardless of these flags — their enforcement
 * is flag-dependent (`api.documents.strictRelations`) and lenient by default, so a hard
 * Zod gate would diverge from real behavior on the default config.
 */
export type InputSchemaMode = {
  /** D&P create: relax required scalars/components to optional-with-hint. */
  lenient?: boolean;
  /** Update: relax every attribute to optional (required ones keep the hint). */
  partial?: boolean;
};

/** Neutral hint appended to required attributes when their hard gate is dropped. */
const REQUIRED_HINT = 'Marked required in the content-type schema — fill it in before publishing.';

/**
 * Appends the required hint to a schema's description without clobbering an existing one.
 * Zod's `.describe()` replaces the description outright, so a required Blocks field would
 * otherwise lose its own "structured rich text content" description. Compose instead.
 */
const withRequiredHint = (s: z.ZodTypeAny): z.ZodTypeAny => {
  const existing = s.description;
  return existing !== undefined && existing !== ''
    ? s.describe(`${existing} ${REQUIRED_HINT}`)
    : s.describe(REQUIRED_HINT);
};

/**
 * Applies the required constraint to a leaf attribute schema according to `mode`.
 *
 * Required fields keep the explanatory hint even under `partial`, so agents can still
 * tell required attributes apart from optional ones on updates (all fields are optional,
 * but only the required ones carry the hint).
 *
 * - required + (`lenient` or `partial`) → optional, with the required hint appended.
 * - required + neither → returned as-is (hard-gated).
 * - not required → optional.
 */
const applyRequired = (s: z.ZodTypeAny, required: boolean, mode: InputSchemaMode): z.ZodTypeAny => {
  if (required === true) {
    if (mode.lenient === true || mode.partial === true) {
      return withRequiredHint(s).optional();
    }
    return s;
  }
  return s.optional();
};

/**
 * Applies the required constraint to relation/media schemas, which are never hard-gated.
 * Required entries always get the hint (relations/media are optional in every mode).
 */
const applyRelationalRequired = (s: z.ZodTypeAny, required: boolean): z.ZodTypeAny => {
  if (required === true) {
    return withRequiredHint(s).optional();
  }
  return s.optional();
};

/**
 * Builds a structured Zod object schema for a Strapi component UID.
 * Declared as a regular function so it is hoisted above `attributeToInputSchema`
 * — the two functions are mutually recursive (component attrs recurse into
 * attributeToInputSchema; attributeToInputSchema calls this for 'component' cases).
 *
 * @param strapi - Strapi instance (components registry available post-load).
 * @param componentUid - e.g. "common.seo".
 * @param visited - cycle-guard; prevents infinite recursion on self-referencing components.
 * @param mode - required-projection mode; propagated so component contents follow the caller's rule.
 */
export function buildComponentInputSchema(
  strapi: Core.Strapi,
  componentUid: string,
  visited: Set<string> = new Set(),
  mode: InputSchemaMode = {}
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
    shape[key] = attributeToInputSchema(strapi, attr, visited, mode);
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
 */
export const attributeToInputSchema = (
  strapi: Core.Strapi,
  attr: Schema.Attribute.AnyAttribute,
  visited: Set<string> = new Set(),
  mode: InputSchemaMode = {}
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
      return applyRequired(s, required === true, mode);
    }
    case 'email': {
      const { required } = attr as Schema.Attribute.Email;
      const s = z.string().email();
      return applyRequired(s, required === true, mode);
    }
    case 'uid': {
      const { required } = attr as Schema.Attribute.UID;
      const s = z.string();
      return applyRequired(s, required === true, mode);
    }
    case 'integer': {
      const { required, min, max } = attr as Schema.Attribute.Integer;
      let s = z.number().int();
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return applyRequired(s, required === true, mode);
    }
    case 'biginteger': {
      const { required } = attr as Schema.Attribute.BigInteger;
      const s = z.string();
      return applyRequired(s, required === true, mode);
    }
    case 'decimal':
    case 'float': {
      const { required, min, max } = attr as Schema.Attribute.Decimal;
      let s = z.number();
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return applyRequired(s, required === true, mode);
    }
    case 'boolean': {
      const { required } = attr as Schema.Attribute.Boolean;
      const s = z.boolean();
      return applyRequired(s, required === true, mode);
    }
    case 'date':
    case 'datetime':
    case 'time':
    case 'timestamp': {
      const { required } = attr as Schema.Attribute.Date;
      const s = z.string();
      return applyRequired(s, required === true, mode);
    }
    case 'enumeration': {
      const { required, enum: values } = attr as Schema.Attribute.Enumeration<string[]>;
      if (Array.isArray(values) && values.length > 0) {
        const s = z.enum(values as [string, ...string[]]);
        return applyRequired(s, required === true, mode);
      }
      const s = z.string();
      return applyRequired(s, required === true, mode);
    }
    case 'json': {
      const { required } = attr as Schema.Attribute.JSON;
      const s = z.any();
      return applyRequired(s, required === true, mode);
    }
    case 'blocks': {
      const { required } = attr as Schema.Attribute.Blocks;
      const s = buildBlocksInputSchema();
      return applyRequired(s, required === true, mode);
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
          ? buildComponentInputSchema(strapi, componentUid, visited, mode)
          : z.record(z.string(), z.unknown());

      let s: z.ZodTypeAny =
        componentAttr.repeatable === true ? z.array(componentSchema) : componentSchema;
      if (componentAttr.repeatable === true && componentAttr.min !== undefined) {
        s = (s as z.ZodArray<z.ZodTypeAny>).min(componentAttr.min);
      }
      if (componentAttr.repeatable === true && componentAttr.max !== undefined) {
        s = (s as z.ZodArray<z.ZodTypeAny>).max(componentAttr.max);
      }
      return applyRequired(s, componentAttr.required === true, mode);
    }
    case 'dynamiczone': {
      const dzAttr = attr as unknown as { required?: boolean; min?: number; max?: number };
      let s = z.array(z.any());
      if (dzAttr.min !== undefined) s = (s as z.ZodArray<z.ZodAny>).min(dzAttr.min);
      if (dzAttr.max !== undefined) s = (s as z.ZodArray<z.ZodAny>).max(dzAttr.max);
      return applyRequired(s, dzAttr.required === true, mode);
    }
    case 'media': {
      const mediaAttr = attr as unknown as { required?: boolean; multiple?: boolean };
      const s = mediaAttr.multiple === true ? z.array(z.any()) : z.any();
      // Media is never hard-gated — enforcement is flag-dependent and lenient by default.
      return applyRelationalRequired(s, mediaAttr.required === true);
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

      // Relations are never hard-gated — enforcement is flag-dependent and lenient by default.
      return applyRelationalRequired(s, relAttr.required === true);
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
            visited,
            mode
          );
        }
      }
      return z.unknown();
    }
  }
};

/**
 * Options controlling how `buildDataSchema` projects the required constraint.
 */
export type BuildDataSchemaOptions = {
  /**
   * When true, the schema is built for an update (partial write): every attribute
   * becomes optional. Overrides the D&P leniency derived from the model.
   */
  partial?: boolean;
};

/**
 * Derives a per-content-type `data` Zod schema from the model's writable attributes.
 * Uses `contentTypes.isWritableAttribute` to filter system-managed keys
 * (id, documentId, timestamps, createdBy, updatedBy, localizations, locale, etc.).
 * Unknown keys are rejected (strict mode) — invalid field names fail at the MCP boundary.
 *
 * Required-field handling mirrors admin/REST draft leniency (CMS-1425):
 * - Updates (`options.partial`) relax every attribute to optional; required attributes
 *   still carry the required hint so the agent can distinguish them from optional ones.
 * - Create on a draft-and-publish model relaxes required scalars/components to
 *   optional-with-hint (MCP create always resolves to a draft, and draft writes skip
 *   required validation).
 * - Create on a non-D&P model keeps the hard gate on required scalars (writes are
 *   published and the entity validator enforces them).
 * - Relations and media are never hard-gated (flag-dependent, lenient by default).
 */
export const buildDataSchema = (
  strapi: Core.Strapi,
  schema: Struct.ContentTypeSchema | ContentManagerModelForMcp,
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null,
  options: BuildDataSchemaOptions = {}
): z.ZodTypeAny => {
  const draftAndPublish = (schema as { options?: { draftAndPublish?: boolean } }).options
    ?.draftAndPublish;
  const mode: InputSchemaMode = {
    partial: options.partial === true,
    lenient: draftAndPublish === true,
  };

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, attr] of Object.entries(attributes)) {
    const isPermitted =
      permittedFields === null ||
      permittedFields === undefined ||
      permittedFields.has(key) === true;

    if (
      isPermitted === true &&
      contentTypes.isWritableAttribute(schema as Struct.ContentTypeSchema, key) === true &&
      contentTypes.isPrivateAttribute(schema as Struct.ContentTypeSchema, key) !== true
    ) {
      shape[key] = attributeToInputSchema(strapi, attr, new Set(), mode);
    }
  }

  return z.object(shape).strict().describe('Document field values to write.');
};
