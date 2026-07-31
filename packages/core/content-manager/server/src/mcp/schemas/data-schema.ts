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
 * Describes the write the emitted schema will validate. Two orthogonal facts fully
 * determine how the required/min constraints are projected, so both are modelled
 * explicitly rather than as a set of overlapping booleans:
 *
 * - `operation` — `create` or `update`. Updates are partial (REST/admin parity): the
 *   entity validator never treats an omitted field as missing, so every attribute becomes
 *   optional regardless of the model.
 * - `draftAndPublish` — whether the target model has draft & publish enabled. An MCP
 *   create always resolves to a draft, and an MCP update edits the draft version, so on a
 *   D&P model the write *targets a draft*. Draft writes skip required and `min`/`minLength`
 *   validation (both server-side in the entity validator and admin-side), so hard-gating
 *   them here would make MCP stricter than the admin panel.
 *
 * Derived rules (see `applyRequired` / `applyAggregateRequired` / `applyMin`):
 * - `targetsDraft`  = `draftAndPublish` — a draft is written on D&P models in either operation.
 * - relax required  = `targetsDraft || operation === 'update'`, for scalars and non-repeatable
 *   components. Aggregates (repeatable components, dynamic zones) relax only on `update`,
 *   because the entity validator requires their key on create even for drafts.
 * - relax min       = `targetsDraft` — only draft writes skip `min`/`minLength`.
 * - hint wording     — publish-oriented on D&P models, lifecycle-neutral otherwise (see
 *   `requiredHint`), because non-D&P writes have no publish step.
 *
 * The mode propagates recursively through components and the custom-field redispatch so
 * required scalars *inside* components follow the same rule as top-level ones.
 *
 * Relations and media are never hard-gated regardless of the mode — their enforcement
 * is flag-dependent (`api.documents.strictRelations`) and lenient by default, so a hard
 * Zod gate would diverge from real behavior on the default config.
 */
export type InputSchemaMode = {
  operation: 'create' | 'update';
  draftAndPublish: boolean;
};

/** Default mode for callers that don't specify one: a published (non-D&P) create — the strictest. */
const DEFAULT_MODE: InputSchemaMode = { operation: 'create', draftAndPublish: false };

/** A D&P model writes a draft in both create and update; non-D&P writes are published. */
const targetsDraft = (mode: InputSchemaMode): boolean => mode.draftAndPublish === true;

/** Required is relaxed when the write targets a draft, or when it is a partial update. */
const relaxesRequired = (mode: InputSchemaMode): boolean =>
  targetsDraft(mode) === true || mode.operation === 'update';

/** `min`/`minLength` is relaxed only when the write targets a draft (drafts skip it). */
const relaxesMin = (mode: InputSchemaMode): boolean => targetsDraft(mode) === true;

/**
 * Hint appended to required attributes when their hard gate is dropped. Wording is
 * mode-aware: only D&P models have a publish step, so the "before publishing" phrasing
 * would be misleading on a non-D&P write (which is enforced when the entry is saved).
 */
const requiredHint = (mode: InputSchemaMode): string =>
  mode.draftAndPublish === true
    ? 'Marked required in the content-type schema — fill it in before publishing.'
    : 'Marked required in the content-type schema — the server enforces it when the entry is saved.';

/**
 * Appends the required hint to a schema's description without clobbering an existing one.
 * Zod's `.describe()` replaces the description outright, so a required Blocks field would
 * otherwise lose its own "structured rich text content" description. Compose instead.
 */
const withRequiredHint = (s: z.ZodTypeAny, mode: InputSchemaMode): z.ZodTypeAny => {
  const hint = requiredHint(mode);
  const existing = s.description;
  return existing !== undefined && existing !== ''
    ? s.describe(`${existing} ${hint}`)
    : s.describe(hint);
};

/**
 * Hint appended to required relation/media attributes. Deliberately distinct from
 * `requiredHint`: enforcement for relations and media depends on
 * `api.documents.strictRelations`, which is disabled by default, so promising that the
 * server enforces the field on save would be false for most configurations. The wording
 * states the schema fact and stays neutral about when (or whether) it is enforced.
 */
const relationalRequiredHint = (mode: InputSchemaMode): string =>
  mode.draftAndPublish === true
    ? 'Marked required in the content-type schema — populate it before publishing.'
    : 'Marked required in the content-type schema — populate it to keep the entry complete.';

/** Appends the relation/media required hint, composing with any existing description. */
const withRelationalRequiredHint = (s: z.ZodTypeAny, mode: InputSchemaMode): z.ZodTypeAny => {
  const hint = relationalRequiredHint(mode);
  const existing = s.description;
  return existing !== undefined && existing !== ''
    ? s.describe(`${existing} ${hint}`)
    : s.describe(hint);
};

/**
 * Hint appended to repeatable-component and dynamic-zone arrays on update. The Document
 * Service replaces these lists wholesale (`document-service/components.ts` deletes any
 * existing row not present in the incoming array), and the schema cannot enforce
 * "include every item you keep" — it depends on document state, and a shorter array is
 * also the legitimate way to delete items. The description must carry the semantics.
 *
 * Both repeatable components and dynamic-zone entries accept `{ "id": N }` to keep a row
 * as-is (see `buildComponentInputSchema` and `buildDynamicZoneItemSchema`), so the wording
 * points at that first and keeps "or its full contents" for entries being created.
 */
const WHOLESALE_REPLACE_HINT =
  'Replaces the entire list: include every item you want to keep — either its "id" to ' +
  'leave it untouched, or its full contents — because any existing item not included is ' +
  'permanently deleted. Omit this field entirely to leave the list unchanged.';

/** Appends the wholesale-replace hint on update, composing with any existing description. */
const withWholesaleReplaceHint = (s: z.ZodTypeAny, mode: InputSchemaMode): z.ZodTypeAny => {
  if (mode.operation !== 'update') {
    return s;
  }
  const existing = s.description;
  return existing !== undefined && existing !== ''
    ? s.describe(`${existing} ${WHOLESALE_REPLACE_HINT}`)
    : s.describe(WHOLESALE_REPLACE_HINT);
};

/**
 * Applies the required constraint to a leaf attribute schema according to `mode`.
 *
 * Required fields keep the explanatory hint whenever the gate is dropped, so agents can
 * still tell required attributes apart from optional ones on updates and drafts (all
 * fields are optional, but only the required ones carry the hint).
 *
 * - required + draft gate dropped → optional and nullable, with the required hint.
 * - required + update gate dropped → optional, with the required hint.
 * - required + gate kept (non-D&P create) → returned as-is (hard-gated).
 * - not required → optional.
 */
const applyRequired = (s: z.ZodTypeAny, required: boolean, mode: InputSchemaMode): z.ZodTypeAny => {
  if (required === true) {
    if (relaxesRequired(mode) === true) {
      const hintedSchema = withRequiredHint(s, mode);
      return targetsDraft(mode) === true
        ? hintedSchema
            .nullable()
            .describe(hintedSchema.description ?? requiredHint(mode))
            .optional()
        : hintedSchema.optional();
    }
    return s;
  }
  return s.optional();
};

/**
 * Applies a `min`/`minLength` lower bound unless the write targets a draft. Admin
 * validation (`admin/src/utils/validation.ts`) and the entity validator
 * (`entity-validator/validators.ts`) both skip minimum checks on drafts, so gating them
 * at Zod would make MCP stricter than the admin panel for draft writes. `max`/`maxLength`
 * is always kept — it maps to a real column limit and applies to drafts too.
 *
 * The same draft projection is applied inline to repeatable-component and dynamic-zone
 * array minima (see the `component` / `dynamiczone` cases), which are aggregate counts
 * rather than scalar bounds and so cannot share this helper's signature.
 */
const applyMin = <T extends z.ZodString | z.ZodNumber>(
  s: T,
  min: number,
  mode: InputSchemaMode
): T => (relaxesMin(mode) === true ? s : (s.min(min) as T));

/**
 * Applies the required constraint to *aggregate* attributes — repeatable components and
 * dynamic zones — which do not follow the scalar draft projection.
 *
 * Scalar `required` is genuinely draft-lenient: the entity validator passes
 * `required: !isDraft && attr.required` for scalars and non-repeatable components, so a
 * draft may omit them. Aggregates are not. `createComponentValidator` (repeatable branch)
 * and `createDzValidator` both pass a hard-coded `required: true` to
 * `addRequiredValidation`, ignoring `isDraft` entirely, and `addDefault` only substitutes
 * `[]` for aggregates that are *not* required. So on creation a required aggregate is
 * `notNil()` with no default, and omitting the key throws `"<field> must be defined"` —
 * draft or not.
 *
 * Relaxing the key here would therefore advertise a contract the server rejects: the agent
 * would send `{}` and get a 400 back. The key stays required on create, and is relaxed only
 * on update, where `addRequiredValidation` uses `notNull()` and an absent key is genuinely
 * accepted.
 *
 * This is deliberately stricter than the scalar projection, and should be revisited if the
 * entity validator ever starts honouring `isDraft` for aggregates.
 */
const applyAggregateRequired = (
  s: z.ZodTypeAny,
  required: boolean,
  mode: InputSchemaMode
): z.ZodTypeAny => {
  if (required === true) {
    // Only a partial update lets the key be absent; drafts do not.
    if (mode.operation === 'update') {
      return withRequiredHint(s, mode).optional();
    }
    return s;
  }
  return s.optional();
};

/**
 * Applies the required constraint to relation/media schemas, which are never hard-gated.
 * Required entries always get the hint (relations/media are optional in every mode), using
 * the configuration-neutral relational wording rather than the scalar guarantee.
 */
const applyRelationalRequired = (
  s: z.ZodTypeAny,
  required: boolean,
  mode: InputSchemaMode
): z.ZodTypeAny => {
  if (required === true) {
    return withRelationalRequiredHint(s, mode).optional();
  }
  return s.optional();
};

/**
 * Identity of an existing component row, used by the `id` patch branch.
 *
 * A row id is always a positive integer, so anything else is a malformed identity rather
 * than a value worth coercing. Bare `z.coerce.number()` is too permissive here: it turns
 * `null`, `false` and `""` into `0`, `true` into `1`, and lets fractional and negative
 * values through — each of which silently becomes "patch some row" instead of failing. The
 * association guard blocks rows belonging to another field or entity, but it cannot stop a
 * bogus id from selecting the wrong sibling already attached to this field, so the schema
 * has to reject those shapes up front.
 *
 * Numeric strings stay accepted (JSON clients routinely stringify ids, and the server
 * stringifies ids to compare them), but only when they are digits — validated explicitly
 * rather than by coercion, so `""` and `"1.5"` fail instead of collapsing to a number.
 *
 * This does advertise a two-member `anyOf` (`integer` / digit-`pattern` string) instead of
 * the plain `number` the previous `z.coerce.number()` emitted. That is the cost of stating
 * the real contract: coercion advertised `number` while silently accepting `null` and
 * `false`, so the simpler JSON Schema was simply inaccurate.
 */
const componentIdSchema = z
  .union([
    z.number().int().positive(),
    z
      .string()
      .regex(/^\d+$/)
      .transform((value) => Number(value))
      .pipe(z.number().int().positive()),
  ])
  .describe('ID of an existing component row.');

/**
 * Builds a structured Zod object schema for a Strapi component UID.
 * Declared as a regular function so it is hoisted above `attributeToInputSchema`
 * — the two functions are mutually recursive (component attrs recurse into
 * attributeToInputSchema; attributeToInputSchema calls this for 'component' cases).
 *
 * On create this is a single object. On update it is a union of a patch branch (requires
 * `id`, contents optional) and a create branch (no `id`, required fields enforced), matching
 * how `updateOrCreateComponent` dispatches server-side. Without the split, a partial update
 * made every nested field optional, so an id-less `{ seo: {} }` passed Zod and then replaced
 * a valid row with one missing its required fields — the entity validator does not catch it
 * because recursive update semantics downgrade `required` to `notNull`, which an absent key
 * satisfies.
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
  mode: InputSchemaMode = DEFAULT_MODE
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

  /** Builds the attribute shape under a given mode (`id` is added by the caller). */
  const shapeFor = (contentsMode: InputSchemaMode): Record<string, z.ZodTypeAny> => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, attr] of Object.entries(component.attributes)) {
      if (key === 'id') {
        // eslint-disable-next-line no-continue
        continue;
      }
      shape[key] = attributeToInputSchema(strapi, attr, visited, contentsMode);
    }
    return shape;
  };

  // On create there is no existing row to patch — a single create-semantics object.
  if (mode.operation !== 'update') {
    const schema = z.object(shapeFor(mode)).strict();
    visited.delete(componentUid);
    return schema;
  }

  // On update the server branches on `id` (`document-service/components.ts`
  // `updateOrCreateComponent`): with an `id` it runs a real partial UPDATE on that row;
  // without one it CREATEs a fresh row (and strips any `id`), replacing the old one. Mirror
  // both branches so an id-less object — a genuine create — is validated with create
  // semantics instead of inheriting the update's blanket optionality.
  const patchBranch = z
    .object({
      id: componentIdSchema.describe('ID of the existing component row to update in place.'),
      ...shapeFor(mode),
    })
    .strict();

  const createBranch = z.object(shapeFor({ ...mode, operation: 'create' })).strict();

  visited.delete(componentUid);

  return z
    .union([patchBranch, createBranch])
    .describe(
      'Include "id" to update an existing component in place — other fields are optional ' +
        'and anything omitted keeps its current value. Omit "id" to replace it: the ' +
        'replacement is created from scratch, so it must satisfy the required fields.'
    );
}

/**
 * Builds the item schema for a dynamic zone: a union over the components the zone allows,
 * discriminated by `__component`.
 *
 * Dynamic-zone entries reach `updateOrCreateComponent` through the same dispatch as ordinary
 * components, so they inherit the same hazard: an entry carrying `id` patches that row, while
 * an id-less entry CREATEs a replacement and deletes the old row. Modelling items as
 * `z.array(z.any())` validated neither `__component` nor the component's required fields, so
 * an id-less `{ __component: 'shared.hero', subtitle: 'new' }` could replace a hero and drop
 * its required `title` — recursive entity validation applies update semantics and only checks
 * `notNull`, which an absent key satisfies. On a non-D&P model that incomplete content is
 * immediately live.
 *
 * Delegating to `buildComponentInputSchema` means each branch gets the id-patch / id-less-create
 * split for free, so required fields are enforced exactly on the branch that creates a row.
 *
 * A zone declaring no components keeps the previous permissive item schema — there is nothing
 * to discriminate on, so rejecting every entry would be worse than accepting any.
 *
 * Note that a UID that does not resolve in the registry degrades to `z.record` inside
 * `buildComponentInputSchema`, and a `z.record` branch accepts any object. One unresolvable
 * component therefore makes the whole zone's union permissive again. That is the pre-existing
 * behaviour for unknown components rather than a regression, and it only arises for a zone
 * pointing at a component that was never registered.
 */
const buildDynamicZoneItemSchema = (
  strapi: Core.Strapi,
  componentUids: string[],
  visited: Set<string>,
  mode: InputSchemaMode
): z.ZodTypeAny => {
  const branches = componentUids.map((uid) => {
    // `__component` selects which component the entry is, so it is required on every entry
    // regardless of mode — without it the server cannot resolve a model at all.
    const componentSchema = buildComponentInputSchema(strapi, uid, new Set(visited), mode);
    const withDiscriminator = (branch: z.ZodTypeAny): z.ZodTypeAny =>
      branch instanceof z.ZodObject
        ? branch.extend({ __component: z.literal(uid) }).strict()
        : branch;

    // On update `buildComponentInputSchema` returns the patch/create union — extend each of
    // its branches rather than wrapping, so the discriminator sits on the objects themselves.
    if (componentSchema instanceof z.ZodUnion) {
      const options = (componentSchema.options as z.ZodTypeAny[]).map(withDiscriminator);
      return z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
    }
    return withDiscriminator(componentSchema);
  });

  if (branches.length === 0) {
    return z.any();
  }
  if (branches.length === 1) {
    return branches[0];
  }
  return z.union(branches as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
};

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
  mode: InputSchemaMode = DEFAULT_MODE
): z.ZodTypeAny => {
  switch (attr.type) {
    case 'string':
    case 'text':
    case 'richtext':
    case 'password': {
      const { required, minLength, maxLength } = attr as Schema.Attribute.String;
      let s: z.ZodString = z.string();
      if (minLength !== undefined) s = applyMin(s, minLength, mode);
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
      if (min !== undefined) s = applyMin(s, min, mode);
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
      if (min !== undefined) s = applyMin(s, min, mode);
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
      if (
        componentAttr.repeatable === true &&
        componentAttr.min !== undefined &&
        relaxesMin(mode) !== true
      ) {
        s = (s as z.ZodArray<z.ZodTypeAny>).min(componentAttr.min);
      }
      if (componentAttr.repeatable === true && componentAttr.max !== undefined) {
        s = (s as z.ZodArray<z.ZodTypeAny>).max(componentAttr.max);
      }
      if (componentAttr.repeatable === true) {
        s = withWholesaleReplaceHint(s, mode);
      }
      // Repeatable components are aggregates: the entity validator requires the key on
      // create even for drafts. Non-repeatable ones follow the scalar draft projection.
      return componentAttr.repeatable === true
        ? applyAggregateRequired(s, componentAttr.required === true, mode)
        : applyRequired(s, componentAttr.required === true, mode);
    }
    case 'dynamiczone': {
      const dzAttr = attr as unknown as {
        required?: boolean;
        min?: number;
        max?: number;
        components?: string[];
      };
      const itemSchema = buildDynamicZoneItemSchema(
        strapi,
        Array.isArray(dzAttr.components) === true ? (dzAttr.components as string[]) : [],
        visited,
        mode
      );
      let s: z.ZodTypeAny = z.array(itemSchema);
      if (dzAttr.min !== undefined && relaxesMin(mode) !== true) {
        s = (s as z.ZodArray<z.ZodTypeAny>).min(dzAttr.min);
      }
      if (dzAttr.max !== undefined) s = (s as z.ZodArray<z.ZodTypeAny>).max(dzAttr.max);
      s = withWholesaleReplaceHint(s, mode);
      return applyAggregateRequired(s, dzAttr.required === true, mode);
    }
    case 'media': {
      const mediaAttr = attr as unknown as { required?: boolean; multiple?: boolean };
      const s = mediaAttr.multiple === true ? z.array(z.any()) : z.any();
      // Media is never hard-gated — enforcement is flag-dependent and lenient by default.
      return applyRelationalRequired(s, mediaAttr.required === true, mode);
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
      return applyRelationalRequired(s, relAttr.required === true, mode);
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
 * Options controlling how `buildDataSchema` projects the required/min constraints.
 */
export type BuildDataSchemaOptions = {
  /**
   * The write the schema validates. Defaults to `create`. Updates are partial, so every
   * attribute becomes optional regardless of the model. Whether the write targets a draft
   * (and therefore relaxes required/min) is derived from the model's draft & publish flag.
   */
  operation?: 'create' | 'update';
};

/**
 * Derives a per-content-type `data` Zod schema from the model's writable attributes.
 * Uses `contentTypes.isWritableAttribute` to filter system-managed keys
 * (id, documentId, timestamps, createdBy, updatedBy, localizations, locale, etc.).
 * Unknown keys are rejected (strict mode) — invalid field names fail at the MCP boundary.
 *
 * Required-field handling mirrors admin/REST draft leniency:
 * - Updates relax every attribute to optional; required attributes still carry the
 *   required hint so the agent can distinguish them from optional ones.
 * - Writes to a draft & publish model target a draft (MCP create resolves to a draft;
 *   MCP update edits the draft version). Drafts skip required and minimum validation, so
 *   those are relaxed to match the admin panel. This covers scalar `min`/`minLength` as
 *   well as the aggregate `min` on repeatable components and dynamic zones — admin and
 *   entity validation skip all of them for drafts.
 * - Create on a non-D&P model keeps the hard gate on required scalars and on `min` (writes
 *   are published and the entity validator enforces them). A non-D&P update stays partial
 *   (required relaxed) but keeps `min`, since the write is published.
 * - Relations and media are never hard-gated (flag-dependent, lenient by default), and
 *   carry configuration-neutral required wording since enforcement hinges on
 *   `api.documents.strictRelations`.
 * - Component values on update are a union: an `id`-bearing patch (contents optional, the
 *   server UPDATEs that row) or an id-less replacement (validated as a create, since the
 *   server CREATEs a fresh row). See `buildComponentInputSchema`. Dynamic-zone entries are a
 *   `__component`-discriminated union over the zone's allowed components and inherit the same
 *   split, so an id-less entry cannot omit that component's required fields.
 * - Required *aggregates* (repeatable components, dynamic zones) are the one exception to
 *   draft leniency: the entity validator requires their key on create regardless of
 *   `isDraft`, so relaxing it here would advertise a write the server rejects. See
 *   `applyAggregateRequired`.
 *
 * NOTE: `update_*` (collection) and `write_*` (single-type upsert) can reach a *create*
 * on the server — a missing locale is created (`collection-handlers.ts`), and an upsert
 * creates on first write (`single-type-handlers.ts`). On a non-D&P model that create is
 * published, so required fields are enforced late, by the entity validator, rather than at
 * this Zod boundary. This is intentional: the input schema is resolved per-tool before the
 * request, so it cannot know whether a given call will update an existing version or create
 * a new one. The partial schema keeps the common update path ergonomic; the server remains
 * the source of truth for the create path.
 */
export const buildDataSchema = (
  strapi: Core.Strapi,
  schema: Struct.ContentTypeSchema | ContentManagerModelForMcp,
  attributes: Struct.SchemaAttributes,
  permittedFields?: Set<string> | null,
  options: BuildDataSchemaOptions = {}
): z.ZodTypeAny => {
  const draftAndPublish =
    (schema as { options?: { draftAndPublish?: boolean } }).options?.draftAndPublish === true;
  const mode: InputSchemaMode = {
    operation: options.operation ?? 'create',
    draftAndPublish,
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
