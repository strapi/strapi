import { errors, contentTypes, async as asyncPipe, setCreatorFields, z } from '@strapi/utils';
import type { Core, Schema, Struct, Modules, UID } from '@strapi/types';

import { buildBlocksInputSchema } from './blocks-schema';

import { ACTIONS } from '../services/permission-checker';
import { getService } from '../utils';
import { getDocumentLocaleAndStatus } from '../controllers/validation/dimensions';
import { formatDocumentWithMetadata } from '../controllers/utils/metadata';
import { indexByDocumentId } from '../controllers/utils/document-status';
import { getPopulateForLocalizations } from '../services/utils/populate';

const isContentTypeLocalized = (strapi: Core.Strapi, uid: string): boolean => {
  const ct = strapi.contentTypes?.[uid as UID.ContentType];
  if (ct === undefined) return false;
  return (
    (ct as { pluginOptions?: { i18n?: { localized?: boolean } } }).pluginOptions?.i18n
      ?.localized === true
  );
};

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

export type ContentManagerModelForMcp = Pick<
  Struct.ContentTypeSchema,
  'uid' | 'kind' | 'options'
> & {
  /** Present on content-manager DTOs from data-mapper.toContentManagerModel */
  apiID: string;
  /**
   * Formatted attributes from data-mapper.toContentManagerModel (includes id, documentId,
   * timestamps, creator fields).
   */
  attributes: Struct.SchemaAttributes;
};

export const slugifyUidForMcpToolName = (uid: string): string => {
  const [namespace, modelName] = uid.split('::');
  const modelNameParts = modelName.split('.').map((part) => part.toLowerCase());
  if (namespace === 'api') {
    return `${modelNameParts[0]}`;
  }
  return `${namespace.toLowerCase()}_${modelNameParts[0]}`;
};

// ---------------------------------------------------------------------------
// Shared input schemas
// ---------------------------------------------------------------------------

const localeSchema = z
  .string()
  .optional()
  .describe('Locale code (e.g. "en", "fr"). Defaults to the default locale.');

type McpToolsBuildContext = {
  /** Installed locale codes from i18n plugin. null when i18n is not installed. */
  localeCodes: [string, ...string[]] | null;
  /** Default locale from i18n plugin. null when i18n is not installed or unknown. */
  defaultLocale: string | null;
};

type McpDocumentQuery = {
  populate?: unknown;
  locale?: string;
  status?: string;
  fields?: unknown;
  filters?: unknown;
  sort?: unknown;
  pagination?: unknown;
  [key: string]: unknown;
};

type McpFindManyParams = Parameters<Modules.Documents.ServiceInstance['findMany']>[0];

const localeDefaultDescription = (
  defaultLocale: string | null,
  allowedLocales: readonly string[]
): string => {
  if (defaultLocale !== null && allowedLocales.includes(defaultLocale)) {
    return `Defaults to "${defaultLocale}".`;
  }

  return 'Defaults to the default locale.';
};

const buildLocaleSchema = (
  localeCodes: [string, ...string[]] | null,
  defaultLocale: string | null
): z.ZodTypeAny => {
  if (localeCodes !== null && localeCodes.length > 0) {
    let schema: z.ZodTypeAny = z.enum(localeCodes).optional();

    if (defaultLocale !== null && localeCodes.includes(defaultLocale)) {
      schema = schema.default(defaultLocale);
    }

    return schema.describe(
      `Locale code. Available: ${localeCodes.join(', ')}. ${localeDefaultDescription(defaultLocale, localeCodes)}`
    );
  }

  return z
    .string()
    .optional()
    .describe('Locale code (e.g. "en", "fr"). Defaults to the default locale.');
};

/**
 * Narrows the base locale schema to only locales the session is permitted to access
 * for the given action + uid combination.
 *
 * Returns the base schema unchanged when:
 *   - localeCodes is null (i18n not installed)
 *   - the content type is not localized
 *   - all installed locales are permitted for this action
 *
 * Returns z.never().optional() when no locales are permitted, keeping the tool
 * registered but signalling no valid locale input.
 */
const resolvePermittedLocaleSchema = (
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext,
  action: string,
  uid: string,
  localeCodes: [string, ...string[]] | null,
  defaultLocale: string | null,
  baseLocaleSchema: z.ZodTypeAny
): z.ZodTypeAny => {
  if (localeCodes === null) return baseLocaleSchema;

  const isLocalized = isContentTypeLocalized(strapi, uid);
  if (isLocalized === false) {
    return z.string().optional().describe('This content type is not localized. Locale is ignored.');
  }

  const permissionChecker = getService('permission-checker').create({
    userAbility: context.userAbility,
    model: uid,
  });
  const permitted = getPermittedLocales(permissionChecker, action, localeCodes);
  if (permitted === null) return baseLocaleSchema;
  if (permitted.length === 0) {
    return z.never().optional().describe('No locale access for this action.');
  }

  let schema: z.ZodTypeAny = z.enum(permitted).optional();

  if (defaultLocale !== null && permitted.includes(defaultLocale)) {
    schema = schema.default(defaultLocale);
  }

  return schema.describe(
    `Locale code. Permitted: ${permitted.join(', ')}. ${localeDefaultDescription(defaultLocale, permitted)}`
  );
};

const statusSchema = z
  .enum(['draft', 'published'])
  .optional()
  .describe('Document status. Defaults to "draft" when draftAndPublish is enabled.');

const documentIdSchema = z
  .string()
  .min(1)
  .describe(
    'Stable document ID (e.g. "z7v8zma53x01r6oceimv922b"). Use this as the canonical identifier across draft/published versions; numeric "id" can differ per version row.'
  );

const pageSchema = z
  .number()
  .int()
  .min(1)
  .optional()
  .describe('Page number (1-indexed, default: 1).');

const pageSizeSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe('Items per page (default: 25, max: 100).');

// ---------------------------------------------------------------------------
// Scalar attribute types — eligible for sort field names and filter operators
// ---------------------------------------------------------------------------

const SCALAR_ATTRIBUTE_TYPES = new Set([
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
const getScalarAttributeKeys = (
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

// ---------------------------------------------------------------------------
// Per-content-type sort schema builder
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-content-type filters schema builder
// ---------------------------------------------------------------------------

/**
 * Maps a scalar Strapi attribute type to the appropriate Zod leaf value schema
 * used inside filter operator objects (e.g. { $eq: <value> }).
 */
const attributeTypeToFilterValue = (attr: Schema.Attribute.AnyAttribute): z.ZodTypeAny => {
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

// All Strapi filter operators (excluding experimental $jsonSupersetOf)
const FILTER_OPERATORS = [
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

const collectionGetInputSchema = z.object({
  documentId: documentIdSchema,
  locale: localeSchema,
  status: statusSchema,
});

// Placeholder data schema for handler type inference — the actual per-content-type
// derived schema (from buildDataSchema) is injected at tool-definition build time.
const writeDataPlaceholder = z
  .record(z.string(), z.unknown())
  .describe('Document field values to write.');

const collectionCreateInputSchema = z.object({
  data: writeDataPlaceholder,
  locale: localeSchema,
});

const collectionUpdateInputSchema = z.object({
  documentId: documentIdSchema,
  data: writeDataPlaceholder,
  locale: localeSchema,
});

const collectionDeleteInputSchema = z.object({
  documentId: documentIdSchema,
  locale: localeSchema,
});

const collectionPublishInputSchema = z.object({
  documentId: documentIdSchema,
  locale: localeSchema,
});

const collectionUnpublishInputSchema = z.object({
  documentId: documentIdSchema,
  locale: localeSchema,
  discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
});

const collectionDiscardDraftInputSchema = z.object({
  documentId: documentIdSchema,
  locale: localeSchema,
});

// Single-type inputs
const singleGetInputSchema = z.object({
  locale: localeSchema,
  status: statusSchema,
});

const singleWriteInputSchema = z.object({
  data: writeDataPlaceholder,
  locale: localeSchema,
});

const singleDeleteInputSchema = z.object({
  locale: localeSchema,
});

const singlePublishInputSchema = z.object({
  locale: localeSchema,
});

const singleUnpublishInputSchema = z.object({
  locale: localeSchema,
  discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
});

const singleDiscardDraftInputSchema = z.object({
  locale: localeSchema,
});

// ---------------------------------------------------------------------------
// Per-content-type data schema derivation
// ---------------------------------------------------------------------------

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
function buildComponentInputSchema(
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
const attributeToInputSchema = (
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
    const isPermitted =
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

  const shape = Object.fromEntries(readableKeys.map((key) => [key, z.unknown().optional()]));

  return z.object(shape).loose();
};

const buildDocumentOutputSchema = (
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

const buildListOutputSchema = (
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

const buildDeleteOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      data: buildOutputDataSchema(attributes, readFields).nullable(),
    })
    .loose();

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type ExplorerAuth = { action: string; subject: string };

type DerivedTool = {
  name: string;
  title: string;
  description: string;
  auth: ExplorerAuth;
  resolveInputSchema: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  resolveOutputSchema: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  createHandler: (
    strapi: Core.Strapi,
    context: Modules.MCP.McpHandlerContext
  ) => Modules.MCP.McpToolHandler<z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authFor = (uid: string, action: string): ExplorerAuth => ({ action, subject: uid });

/**
 * Recursively resolves leaf field paths for a component, matching the nested
 * path format used by CASL rules (e.g. 'SEO.title', 'SEO.og.image').
 *
 * The admin RBAC system decomposes component attrs into nested paths and removes
 * the parent key — so checking `ability.can(action, uid, 'SEO')` returns false
 * even when the user has full access to the component's sub-fields.
 */
export const getComponentLeafPaths = (
  strapi: Core.Strapi,
  componentUid: string,
  prefix: string,
  visited: Set<string> = new Set()
): string[] => {
  if (visited.has(componentUid) === true) return [prefix];

  type ComponentEntry = { attributes: Record<string, { type: string; component?: string }> };
  const component = (strapi.components as unknown as Record<string, ComponentEntry | undefined>)[
    componentUid
  ];
  if (component === undefined) return [prefix];

  visited.add(componentUid);
  const paths: string[] = [];

  for (const [key, attr] of Object.entries(component.attributes)) {
    if (key === 'id') {
      // skip system id field — it is not a user-facing permission path
      // eslint-disable-next-line no-continue
      continue;
    }
    const fieldPath = `${prefix}.${key}`;

    if (attr.type === 'component' && attr.component !== undefined) {
      paths.push(...getComponentLeafPaths(strapi, attr.component, fieldPath, visited));
    } else {
      paths.push(fieldPath);
    }
  }

  visited.delete(componentUid);

  return paths.length > 0 ? paths : [prefix];
};

const getPermittedFields = (
  strapi: Core.Strapi,
  userAbility: Modules.MCP.McpHandlerContext['userAbility'],
  action: string,
  uid: string,
  attributes: Struct.SchemaAttributes
): Set<string> | null => {
  const allKeys = Object.keys(attributes);
  const permitted = allKeys.filter((key) => {
    if (userAbility.can(action, uid, key) === true) return true;

    // Component attrs: CASL rules use nested paths (e.g. 'SEO.title').
    // Check if at least one sub-field path is permitted.
    const attr = attributes[key] as { type: string; component?: string };
    if (attr.type === 'component' && attr.component !== undefined) {
      const leafPaths = getComponentLeafPaths(strapi, attr.component, key);
      return leafPaths.some((path) => userAbility.can(action, uid, path) === true);
    }

    return false;
  });

  if (permitted.length === allKeys.length) {
    return null;
  }

  return new Set(permitted);
};

const getPermittedLocales = (
  permissionChecker: { cannot: (action: string, entity?: unknown) => boolean },
  action: string,
  localeCodes: [string, ...string[]]
): [string, ...string[]] | null => {
  const permitted = localeCodes.filter(
    (code) => permissionChecker.cannot(action, { locale: code }) === false
  );

  if (permitted.length === localeCodes.length) {
    return null;
  }

  return permitted.length > 0
    ? (permitted as [string, ...string[]])
    : ([] as unknown as [string, ...string[]]);
};

const ok = (structuredContent: Record<string, unknown>): Modules.MCP.McpToolHandlerReturn => ({
  content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
  structuredContent,
});

const describeTool = (params: {
  apiID: string;
  uid: string;
  operation: string;
}): { title: string; description: string } => {
  const { apiID, uid, operation } = params;
  const operationNoteByType: Partial<Record<string, string>> = {
    publish:
      ' Operates on an existing document by documentId and may return a different numeric id for the published version row.',
    unpublish:
      ' Operates on an existing document by documentId and may return a different numeric id for the draft version row.',
    discard_draft:
      ' Operates on an existing document by documentId; treat documentId as the stable identity.',
  };

  return {
    title: `Content: ${apiID} — ${operation}`,
    description: `Content-manager ${operation} for ${uid}.${operationNoteByType[operation] ?? ''}`,
  };
};

// ---------------------------------------------------------------------------
// Collection-type handler factories
// ---------------------------------------------------------------------------

type CollectionListArgs = {
  locale?: string;
  status?: 'draft' | 'published';
  page?: number;
  pageSize?: number;
  sort?: unknown;
  filters?: unknown;
};

const createCollectionListHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({ args }: { args: CollectionListArgs }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale, status, page, pageSize, sort, filters } = args;

    const documentMetadata = getService('document-metadata');
    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const query: Record<string, unknown> = {
      ...(page !== undefined && { page }),
      ...(pageSize !== undefined && { pageSize }),
      ...(sort !== undefined && { sort }),
      ...(filters !== undefined && { filters }),
    };

    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .populateDeep(1)
      .countRelations({ toOne: false, toMany: true })
      .withPopulateOverride(getPopulateForLocalizations(uid))
      .build();

    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const findPageQuery: McpDocumentQuery = {
      ...permissionQuery,
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    };
    const { results: documents, pagination } = await documentManager.findPage(
      findPageQuery as McpFindManyParams,
      uid
    );

    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(strapi.getModel(uid));
    const statusByDocumentId = hasDraftAndPublish
      ? indexByDocumentId(await documentMetadata.getManyAvailableStatus(uid, documents))
      : new Map();

    const setStatus = (document: any) => {
      const availableStatuses = statusByDocumentId.get(document.documentId) || [];
      document.status = documentMetadata.getStatus(document, availableStatuses);
      return document;
    };

    const results = await asyncPipe.map(
      documents,
      asyncPipe.pipe(permissionChecker.sanitizeOutput, setStatus)
    );

    return ok({ results, pagination } as Record<string, unknown>);
  };

const createCollectionGetHandler =
  (uid: UID.CollectionType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale, status } = args as z.infer<typeof collectionGetInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read({ locale, status });

    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .withPopulateOverride(getPopulateForLocalizations(uid))
      .build();

    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const version = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    });

    if (!version) {
      const exists = await documentManager.exists(uid, documentId);
      if (!exists) {
        throw new errors.NotFoundError();
      }

      const { meta } = await formatDocumentWithMetadata(
        permissionChecker,
        uid,
        { documentId, locale: resolvedLocale, publishedAt: null } as Parameters<
          typeof formatDocumentWithMetadata
        >[2],
        { availableLocales: true, availableStatus: false }
      );

      return ok({ data: {}, meta } as Record<string, unknown>);
    }

    if (permissionChecker.cannot.read(version)) {
      throw new errors.ForbiddenError();
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(version);
    const result = await formatDocumentWithMetadata(permissionChecker, uid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

const createCollectionCreateHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility, user } = context;
    const { data, locale } = args as z.infer<typeof collectionCreateInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.create()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedData = setCreatorFields({ user })(
      await permissionChecker.sanitizeCreateInput(data)
    ) as Record<string, unknown>;

    const { locale: resolvedLocale, status } = await getDocumentLocaleAndStatus({ locale }, uid);

    const result = await strapi.db.transaction(async () => {
      const document = await documentManager.create(uid, {
        data: sanitizedData,
        locale: resolvedLocale,
        status,
      });

      const sanitizedDocument = await permissionChecker.sanitizeOutput(document);
      return formatDocumentWithMetadata(permissionChecker, uid, sanitizedDocument, {
        availableLocales: false,
        availableStatus: false,
      });
    });

    return ok(result as Record<string, unknown>);
  };

const createCollectionUpdateHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility, user } = context;
    const { documentId, data, locale } = args as z.infer<typeof collectionUpdateInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.update()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.update({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const [documentVersion, documentExists] = await Promise.all([
      documentManager.findOne(documentId, uid, {
        populate,
        locale: resolvedLocale,
        status: 'draft',
      }),
      documentManager.exists(uid, documentId),
    ]);

    if (!documentExists) {
      throw new errors.NotFoundError();
    }

    // If version is not found but document exists, the intent is to create a new locale
    if (documentVersion) {
      if (permissionChecker.cannot.update(documentVersion)) {
        throw new errors.ForbiddenError();
      }
    } else if (permissionChecker.cannot.create()) {
      throw new errors.ForbiddenError();
    }

    const sanitizeInput = documentVersion
      ? permissionChecker.sanitizeUpdateInput(documentVersion)
      : permissionChecker.sanitizeCreateInput;

    const isEdition = documentVersion !== null && documentVersion !== undefined;
    const sanitizedData = setCreatorFields({ user, isEdition })(
      await sanitizeInput(data)
    ) as Record<string, unknown>;

    const result = await strapi.db.transaction(async () => {
      const updatedDocument = await documentManager.update(
        documentVersion?.documentId ?? documentId,
        uid,
        { data: sanitizedData, locale: resolvedLocale }
      );

      const sanitizedDocument = await permissionChecker.sanitizeOutput(updatedDocument);
      return formatDocumentWithMetadata(permissionChecker, uid, sanitizedDocument);
    });

    return ok(result as Record<string, unknown>);
  };

const createCollectionDeleteHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as z.infer<typeof collectionDeleteInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.delete()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.delete({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const isLocalized = isContentTypeLocalized(strapi, uid);

    const localeForQuery = isLocalized === true ? resolvedLocale : undefined;

    const documentLocales = await documentManager.findLocales(documentId, uid, {
      populate,
      locale: localeForQuery,
    });

    if (documentLocales.length === 0) {
      throw new errors.NotFoundError();
    }

    for (const document of documentLocales) {
      if (permissionChecker.cannot.delete(document)) {
        throw new errors.ForbiddenError();
      }
    }

    const result = await documentManager.delete(documentId, uid, { locale: localeForQuery });
    const sanitizedResult = await permissionChecker.sanitizeOutput(result);

    return ok({ data: sanitizedResult } as Record<string, unknown>);
  };

const createCollectionPublishHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as z.infer<typeof collectionPublishInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.publish()) {
      throw new errors.ForbiddenError();
    }

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const publishedDocument = await strapi.db.transaction(async () => {
      const exists = await documentManager.exists(uid, documentId);
      if (!exists) {
        throw new errors.NotFoundError('Document not found.');
      }

      const document = await documentManager.findOne(documentId, uid, {
        locale: resolvedLocale,
        status: 'draft',
      });

      if (!document) {
        throw new errors.NotFoundError('Document locale not found.');
      }

      if (permissionChecker.cannot.publish(document)) {
        throw new errors.ForbiddenError();
      }

      const publishResult = await documentManager.publish(document.documentId, uid, {
        locale: resolvedLocale,
      });

      if (!publishResult || publishResult.length === 0) {
        throw new errors.NotFoundError('Document not found or already published.');
      }

      return publishResult[0];
    });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(publishedDocument);
    const result = await formatDocumentWithMetadata(permissionChecker, uid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

const createCollectionUnpublishHandler =
  (uid: UID.CollectionType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale, discardDraft } = args as z.infer<
      typeof collectionUnpublishInputSchema
    >;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.unpublish()) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.unpublish({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const document = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: 'published',
    });

    if (!document) {
      throw new errors.NotFoundError();
    }

    if (permissionChecker.cannot.unpublish(document)) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const unpublishedDocument = await strapi.db.transaction(async () => {
      if (discardDraft === true) {
        await documentManager.discardDraft(document.documentId, uid, { locale: resolvedLocale });
      }

      return documentManager.unpublish(document.documentId, uid, { locale: resolvedLocale });
    });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(unpublishedDocument);
    const result = await formatDocumentWithMetadata(permissionChecker, uid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

const createCollectionDiscardDraftHandler =
  (uid: UID.CollectionType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { documentId, locale } = args as z.infer<typeof collectionDiscardDraftInputSchema>;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({ userAbility, model: uid });

    if (permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.discard({ locale });
    const populate = await getService('populate-builder')(uid)
      .populateFromQuery(permissionQuery)
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const document = await documentManager.findOne(documentId, uid, {
      populate,
      locale: resolvedLocale,
      status: 'published',
    });

    if (!document) {
      throw new errors.NotFoundError();
    }

    if (permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const discardedDocument = await asyncPipe.pipe(
      (doc: any) => documentManager.discardDraft(doc.documentId, uid, { locale: resolvedLocale }),
      permissionChecker.sanitizeOutput,
      (doc: any) => formatDocumentWithMetadata(permissionChecker, uid, doc)
    )(document);

    return ok(discardedDocument as Record<string, unknown>);
  };

// ---------------------------------------------------------------------------
// Single-type handler factories
// ---------------------------------------------------------------------------

/** Shared create-or-update logic mirroring single-types controller. */
const singleCreateOrUpdate = async (
  strapi: Core.Strapi,
  uid: UID.SingleType,
  context: Modules.MCP.McpHandlerContext,
  args: { data: Record<string, unknown>; locale?: string }
): Promise<Modules.MCP.McpToolHandlerReturn> => {
  const { userAbility, user } = context;
  const { data, locale } = args;
  // TODO @Nico: fix UID.SingleType assignability in @strapi/types
  const typedUid = uid as UID.ContentType;

  const documentManager = getService('document-manager');
  const permissionChecker = getService('permission-checker').create({
    userAbility,
    model: uid as string,
  });

  if (permissionChecker.cannot.create() && permissionChecker.cannot.update()) {
    throw new errors.ForbiddenError();
  }

  const sanitizedQuery = await permissionChecker.sanitizedQuery.update({ locale });
  const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

  const populate = await getService('populate-builder')(typedUid)
    .populateFromQuery(sanitizedQuery)
    .populateDeep(Infinity)
    .countRelations()
    .withPopulateOverride(getPopulateForLocalizations(typedUid))
    .build();

  const draftFindQuery: McpDocumentQuery = {
    ...sanitizedQuery,
    populate,
    locale: resolvedLocale,
    status: 'draft',
  };
  const [documentVersion, otherDocumentVersion] = await Promise.all([
    documentManager
      .findMany(draftFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]),
    strapi.db.query(typedUid).findOne({ select: ['documentId'] }),
  ]);

  const documentId = otherDocumentVersion?.documentId;

  if (documentVersion) {
    if (permissionChecker.cannot.update(documentVersion)) {
      throw new errors.ForbiddenError();
    }
  } else if (permissionChecker.cannot.create()) {
    throw new errors.ForbiddenError();
  }

  const sanitizeInput = documentVersion
    ? permissionChecker.sanitizeUpdateInput(documentVersion)
    : permissionChecker.sanitizeCreateInput;

  const isEdition = documentVersion !== null && documentVersion !== undefined;
  const sanitizedData = setCreatorFields({ user, isEdition })(await sanitizeInput(data)) as Record<
    string,
    unknown
  >;

  const formatted = await strapi.db.transaction(async () => {
    let doc: any;

    if (documentId === undefined) {
      doc = await documentManager.create(typedUid, {
        data: sanitizedData,
        ...sanitizedQuery,
        locale: resolvedLocale,
      });
    } else {
      doc = await documentManager.update(documentId, typedUid, {
        data: sanitizedData,
        populate,
        locale: resolvedLocale,
      });
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(doc);
    return formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);
  });

  return ok(formatted as Record<string, unknown>);
};

const createSingleGetHandler =
  (uid: UID.SingleType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale, status } = args as z.infer<typeof singleGetInputSchema>;
    // TODO @Nico: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.read()) {
      throw new errors.ForbiddenError();
    }

    const permissionQuery = await permissionChecker.sanitizedQuery.read({ locale, status });
    const { locale: resolvedLocale, status: resolvedStatus } = await getDocumentLocaleAndStatus(
      { locale, status },
      uid
    );

    const populate = await getService('populate-builder')(typedUid)
      .populateFromQuery(permissionQuery)
      .populateDeep(Infinity)
      .countRelations()
      .withPopulateOverride(getPopulateForLocalizations(typedUid))
      .build();

    const versionFindQuery: McpDocumentQuery = {
      ...permissionQuery,
      populate,
      locale: resolvedLocale,
      status: resolvedStatus,
    };
    const version = await getService('document-manager')
      .findMany(versionFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!version) {
      if (permissionChecker.cannot.create()) {
        throw new errors.ForbiddenError();
      }

      const document = await strapi.db.query(typedUid).findOne({});

      if (!document) {
        throw new errors.NotFoundError();
      }

      const { meta } = await formatDocumentWithMetadata(
        permissionChecker,
        typedUid,
        {
          documentId: document.documentId,
          locale: resolvedLocale,
          publishedAt: null,
        } as Parameters<typeof formatDocumentWithMetadata>[2],
        { availableLocales: true, availableStatus: false }
      );

      return ok({ data: {}, meta } as Record<string, unknown>);
    }

    if (permissionChecker.cannot.read(version)) {
      throw new errors.ForbiddenError();
    }

    const sanitizedDocument = await permissionChecker.sanitizeOutput(version);
    const result = await formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

const createSingleWriteHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    return singleCreateOrUpdate(
      strapi,
      uid,
      context,
      args as z.infer<typeof singleWriteInputSchema>
    );
  };

const createSingleDeleteHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args as z.infer<typeof singleDeleteInputSchema>;
    // TODO @Nico: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.delete()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.delete({ locale });

    const populate = await getService('populate-builder')(typedUid)
      .populateFromQuery(sanitizedQuery)
      .populateDeep(Infinity)
      .countRelations()
      .withPopulateOverride(getPopulateForLocalizations(typedUid))
      .build();

    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const isLocalized = isContentTypeLocalized(strapi, uid);

    const localeForQuery = isLocalized === true ? resolvedLocale : undefined;

    const documentLocales = await documentManager.findLocales(undefined, typedUid, {
      populate,
      locale: localeForQuery,
    });

    if (documentLocales.length === 0) {
      throw new errors.NotFoundError();
    }

    for (const document of documentLocales) {
      if (permissionChecker.cannot.delete(document)) {
        throw new errors.ForbiddenError();
      }
    }

    const deletedEntity = await documentManager.delete(documentLocales[0].documentId, typedUid, {
      locale: localeForQuery,
    });

    const sanitizedResult = await permissionChecker.sanitizeOutput(deletedEntity);

    return ok({ data: sanitizedResult } as Record<string, unknown>);
  };

const createSinglePublishHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args as z.infer<typeof singlePublishInputSchema>;
    // TODO @Nico: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.publish()) {
      throw new errors.ForbiddenError();
    }

    const publishedDocument = await strapi.db.transaction(async () => {
      const sanitizedQuery = await permissionChecker.sanitizedQuery.publish({ locale });
      const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

      const publishFindQuery: McpDocumentQuery = {
        ...sanitizedQuery,
        locale: resolvedLocale,
        status: 'draft',
      };
      const document = await getService('document-manager')
        .findMany(publishFindQuery as McpFindManyParams, typedUid)
        .then((docs: any[]) => docs[0]);

      if (!document) {
        throw new errors.NotFoundError('Single type document not found.');
      }

      if (permissionChecker.cannot.publish(document)) {
        throw new errors.ForbiddenError();
      }

      const publishResult = await documentManager.publish(document.documentId, typedUid, {
        locale: resolvedLocale,
      });

      return publishResult?.at(0);
    });

    const sanitizedDocument = await permissionChecker.sanitizeOutput(publishedDocument);
    const result = await formatDocumentWithMetadata(permissionChecker, typedUid, sanitizedDocument);

    return ok(result as Record<string, unknown>);
  };

const createSingleUnpublishHandler =
  (uid: UID.SingleType) =>
  (strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale, discardDraft } = args as z.infer<typeof singleUnpublishInputSchema>;
    // TODO @Nico: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.unpublish()) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.unpublish({ locale });
    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const unpublishFindQuery: McpDocumentQuery = { ...sanitizedQuery, locale: resolvedLocale };
    const document = await getService('document-manager')
      .findMany(unpublishFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!document) {
      throw new errors.NotFoundError();
    }

    if (permissionChecker.cannot.unpublish(document)) {
      throw new errors.ForbiddenError();
    }

    if (discardDraft === true && permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const result = await strapi.db.transaction(async () => {
      if (discardDraft === true) {
        await documentManager.discardDraft(document.documentId, typedUid, {
          locale: resolvedLocale,
        });
      }

      return asyncPipe.pipe(
        (doc: any) =>
          documentManager.unpublish(doc.documentId, typedUid, { locale: resolvedLocale }),
        permissionChecker.sanitizeOutput,
        (doc: any) => formatDocumentWithMetadata(permissionChecker, typedUid, doc)
      )(document);
    });

    return ok(result as Record<string, unknown>);
  };

const createSingleDiscardDraftHandler =
  (uid: UID.SingleType) =>
  (_strapi: Core.Strapi, context: Modules.MCP.McpHandlerContext) =>
  async ({
    args,
  }: {
    args: Record<string, unknown>;
  }): Promise<Modules.MCP.McpToolHandlerReturn> => {
    const { userAbility } = context;
    const { locale } = args as z.infer<typeof singleDiscardDraftInputSchema>;
    // TODO @Nico: fix UID.SingleType assignability in @strapi/types
    const typedUid = uid as UID.ContentType;

    const documentManager = getService('document-manager');
    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: uid as string,
    });

    if (permissionChecker.cannot.discard()) {
      throw new errors.ForbiddenError();
    }

    const sanitizedQuery = await permissionChecker.sanitizedQuery.discard({ locale });
    const { locale: resolvedLocale } = await getDocumentLocaleAndStatus({ locale }, uid);

    const discardFindQuery: McpDocumentQuery = {
      ...sanitizedQuery,
      locale: resolvedLocale,
      status: 'published',
    };
    const document = await getService('document-manager')
      .findMany(discardFindQuery as McpFindManyParams, typedUid)
      .then((docs: any[]) => docs[0]);

    if (!document) {
      throw new errors.NotFoundError();
    }

    if (permissionChecker.cannot.discard(document)) {
      throw new errors.ForbiddenError();
    }

    const discardedDocument = await asyncPipe.pipe(
      (doc: any) =>
        documentManager.discardDraft(doc.documentId, typedUid, { locale: resolvedLocale }),
      permissionChecker.sanitizeOutput,
      (doc: any) => formatDocumentWithMetadata(permissionChecker, typedUid, doc)
    )(document);

    return ok(discardedDocument as Record<string, unknown>);
  };

// ---------------------------------------------------------------------------
// Tool-definition builders
// ---------------------------------------------------------------------------

const buildCollectionTools = (
  strapi: Core.Strapi,
  model: ContentManagerModelForMcp,
  ctx: McpToolsBuildContext
): DerivedTool[] => {
  const uid = model.uid as UID.CollectionType;
  const slug = slugifyUidForMcpToolName(uid);
  const draftAndPublish = model.options?.draftAndPublish === true;
  const { attributes } = model;
  const runtimeLocaleSchema = buildLocaleSchema(ctx.localeCodes, ctx.defaultLocale);

  const resolveReadFields = (context: Modules.MCP.McpHandlerContext) =>
    getPermittedFields(strapi, context.userAbility, ACTIONS.read, uid, attributes);

  const resolveReadOutputSchema = (context: Modules.MCP.McpHandlerContext) =>
    buildDocumentOutputSchema(attributes, resolveReadFields(context));

  const resolveListInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const readFields = resolveReadFields(context);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      status: statusSchema,
      page: pageSchema,
      pageSize: pageSizeSchema,
      sort: buildSortSchema(attributes, readFields),
      filters: buildFiltersSchema(attributes, readFields),
    });
  };

  const resolveGetInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
      status: statusSchema,
    });
  };

  const resolveCreateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.create,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.create,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({ data: dataSchema, locale: localeSchema });
  };

  const resolveUpdateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.update,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.update,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      data: dataSchema,
      locale: localeSchema,
    });
  };

  const resolveDeleteInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.delete,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const resolvePublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.publish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const resolveUnpublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.unpublish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
      discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
    });
  };

  const resolveDiscardDraftInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.discard,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const tools: DerivedTool[] = [
    {
      name: `list_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'list' }),
      auth: authFor(uid, ACTIONS.read),
      resolveInputSchema: resolveListInputSchema,
      resolveOutputSchema: (context) =>
        buildListOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createCollectionListHandler(uid),
    },
    {
      name: `get_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'get' }),
      auth: authFor(uid, ACTIONS.read),
      resolveInputSchema: resolveGetInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionGetHandler(uid),
    },
    {
      name: `create_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'create' }),
      auth: authFor(uid, ACTIONS.create),
      resolveInputSchema: resolveCreateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionCreateHandler(uid),
    },
    {
      name: `update_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'update' }),
      auth: authFor(uid, ACTIONS.update),
      resolveInputSchema: resolveUpdateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionUpdateHandler(uid),
    },
    {
      name: `delete_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'delete' }),
      auth: authFor(uid, ACTIONS.delete),
      resolveInputSchema: resolveDeleteInputSchema,
      resolveOutputSchema: (context) =>
        buildDeleteOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createCollectionDeleteHandler(uid),
    },
  ];

  if (draftAndPublish === true) {
    tools.push(
      {
        name: `publish_${slug}`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'publish' }),
        auth: authFor(uid, ACTIONS.publish),
        resolveInputSchema: resolvePublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionPublishHandler(uid),
      },
      {
        name: `unpublish_${slug}`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'unpublish' }),
        auth: authFor(uid, ACTIONS.unpublish),
        resolveInputSchema: resolveUnpublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionUnpublishHandler(uid),
      },
      {
        name: `discard_${slug}_draft`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'discard_draft' }),
        auth: authFor(uid, ACTIONS.discard),
        resolveInputSchema: resolveDiscardDraftInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionDiscardDraftHandler(uid),
      }
    );
  }

  return tools;
};

const buildSingleTypeTools = (
  strapi: Core.Strapi,
  model: ContentManagerModelForMcp,
  ctx: McpToolsBuildContext
): DerivedTool[] => {
  const uid = model.uid as UID.SingleType;
  const slug = slugifyUidForMcpToolName(uid);
  const draftAndPublish = model.options?.draftAndPublish === true;
  const { attributes } = model;
  const runtimeLocaleSchema = buildLocaleSchema(ctx.localeCodes, ctx.defaultLocale);

  const resolveReadFields = (context: Modules.MCP.McpHandlerContext) =>
    getPermittedFields(strapi, context.userAbility, ACTIONS.read, uid, attributes);

  const resolveReadOutputSchema = (context: Modules.MCP.McpHandlerContext) =>
    buildDocumentOutputSchema(attributes, resolveReadFields(context));

  const resolveGetInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      status: statusSchema,
    });
  };

  const resolveCreateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.create,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.create,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({ data: dataSchema, locale: localeSchema });
  };

  const resolveUpdateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.update,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.update,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({ data: dataSchema, locale: localeSchema });
  };

  const resolveDeleteInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.delete,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const resolvePublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.publish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const resolveUnpublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.unpublish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
    });
  };

  const resolveDiscardDraftInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.discard,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const tools: DerivedTool[] = [
    {
      name: `get_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'get' }),
      auth: authFor(uid, ACTIONS.read),
      resolveInputSchema: resolveGetInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createSingleGetHandler(uid),
    },
    {
      name: `create_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'create' }),
      auth: authFor(uid, ACTIONS.create),
      resolveInputSchema: resolveCreateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createSingleWriteHandler(uid),
    },
    {
      name: `update_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'update' }),
      auth: authFor(uid, ACTIONS.update),
      resolveInputSchema: resolveUpdateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createSingleWriteHandler(uid),
    },
    {
      name: `delete_${slug}`,
      ...describeTool({ apiID: model.apiID, uid, operation: 'delete' }),
      auth: authFor(uid, ACTIONS.delete),
      resolveInputSchema: resolveDeleteInputSchema,
      resolveOutputSchema: (context) =>
        buildDeleteOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createSingleDeleteHandler(uid),
    },
  ];

  if (draftAndPublish === true) {
    tools.push(
      {
        name: `publish_${slug}`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'publish' }),
        auth: authFor(uid, ACTIONS.publish),
        resolveInputSchema: resolvePublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSinglePublishHandler(uid),
      },
      {
        name: `unpublish_${slug}`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'unpublish' }),
        auth: authFor(uid, ACTIONS.unpublish),
        resolveInputSchema: resolveUnpublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSingleUnpublishHandler(uid),
      },
      {
        name: `discard_${slug}_draft`,
        ...describeTool({ apiID: model.apiID, uid, operation: 'discard_draft' }),
        auth: authFor(uid, ACTIONS.discard),
        resolveInputSchema: resolveDiscardDraftInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSingleDiscardDraftHandler(uid),
      }
    );
  }

  return tools;
};

/**
 * Builds MCP tool definitions for displayed content-manager models.
 * Visibility is enforced separately via static auth on each tool and MCP session capability sync.
 */
export const deriveDisplayedContentTypeMcpToolDefinitions = (
  strapi: Core.Strapi,
  models: ContentManagerModelForMcp[],
  ctx: McpToolsBuildContext = { localeCodes: null, defaultLocale: null }
): DerivedTool[] => {
  const tools: DerivedTool[] = [];

  for (const model of models) {
    if (model.kind === 'collectionType') {
      tools.push(...buildCollectionTools(strapi, model, ctx));
    } else if (model.kind === 'singleType') {
      tools.push(...buildSingleTypeTools(strapi, model, ctx));
    }
  }

  return tools;
};
