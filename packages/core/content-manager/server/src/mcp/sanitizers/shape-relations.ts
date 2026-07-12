import { traverseEntity } from '@strapi/utils';
import type { UID } from '@strapi/types';

// Relations whose cardinality is "many" — maps to Array output.
// Includes non-owning variants and morph-many.
const MANY_RELATION_TYPES = new Set([
  'oneToMany',
  'manyToMany',
  'manyWay',
  'morphToMany',
  'morphMany',
]);

/**
 * Canonical "is this relation a list" predicate for the MCP output boundary.
 * Both the runtime shaping (reduceToIdentity) and the registered output schemas
 * (output-schemas.ts) MUST use this single definition — the MCP SDK validates
 * structuredContent against the schema, so any divergence fails the tool call.
 * Intentionally broader than `relations.isAnyToMany` from @strapi/utils, which
 * ignores `manyWay` and the morph variants.
 */
export const isManyRelationForMcp = (attribute: { relation?: string }): boolean =>
  MANY_RELATION_TYPES.has(attribute.relation ?? '');

type RelationIdentity = {
  documentId: string;
  locale?: string;
  __type?: string;
  status?: string;
};

/**
 * Extracts identity fields from a single relation entry.
 * Returns undefined when the entry has no documentId (e.g. a bare {count} object).
 */
const pickIdentity = (entry: unknown): RelationIdentity | undefined => {
  if (entry === null || typeof entry !== 'object') {
    return undefined;
  }

  const obj = entry as Record<string, unknown>;

  if (typeof obj.documentId !== 'string') {
    return undefined;
  }

  const identity: RelationIdentity = { documentId: obj.documentId };

  if (typeof obj.locale === 'string') {
    identity.locale = obj.locale;
  }

  if (typeof obj.__type === 'string') {
    identity.__type = obj.__type;
  }

  // Preserve the computed publish status on `localizations` entries — it is
  // calculated by formatDocumentWithMetadata BEFORE shaping (calculate, then strip).
  // Non-localization relation entries never carry a string `status`, so this is a no-op for them.
  if (typeof obj.status === 'string') {
    identity.status = obj.status;
  }

  return identity;
};

/**
 * Reduces a populated relation value to identity-only shape.
 *
 * to-one → { documentId, locale?, __type? } | null
 * to-many → Array<{ documentId, locale?, __type? }>  ([] when empty)
 */
const reduceToIdentity = (
  attribute: { relation?: string },
  value: unknown
): RelationIdentity | RelationIdentity[] | null => {
  const isMany = isManyRelationForMcp(attribute);

  if (isMany) {
    if (Array.isArray(value)) {
      return value.map(pickIdentity).filter((v): v is RelationIdentity => v !== undefined);
    }
    // defensive: { count: N } or null/undefined → empty array
    return [];
  }

  // to-one
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    // should not happen, but guard: treat first element
    return pickIdentity(value[0]) ?? null;
  }

  return pickIdentity(value) ?? null;
};

/**
 * Callback that inlines a single related entry, sanitized against the RELATED type's
 * own read permissions. Returns the sanitized entry to inline, or `null`/`undefined`
 * to fall back to an identity stub (e.g. when the caller may not read the target type).
 * Relations on the returned entry are shaped by the outer traversal — inlined further
 * only when their own path is opted in, so inline depth follows the populate spec.
 */
export type InlineRelationResolver = (
  targetUid: string,
  entry: Record<string, unknown>
) => Promise<Record<string, unknown> | null | undefined>;

export type ShapeRelationsOptions = {
  /**
   * Predicate over a relation's dotted attribute path (e.g. "author" or "author.avatar").
   * Returns true for relations the caller opted into inlining via `populate` — driven by
   * the populate spec, so inline depth matches the request.
   */
  shouldInline: (attributePath: string | null | undefined) => boolean;
  /** Resolver that sanitizes an inlined entry against the related type's read permissions. */
  inlineRelation: InlineRelationResolver;
};

/** Resolves the target UID for a relation entry — morph relations carry it on `__type`. */
const resolveTargetUid = (
  attribute: { relation?: string; target?: string },
  entry: Record<string, unknown>
): string | undefined => {
  if (typeof entry.__type === 'string') {
    return entry.__type;
  }
  return attribute.target;
};

/**
 * Post-sanitize shaping visitor factory.
 * Reduces every relation attribute to identity-only (documentId + locale? + __type?),
 * EXCEPT relations whose attribute path the caller opted into inlining — those are
 * replaced with a `permissionChecker`-sanitized full entry (RBAC of the related type
 * applied). The outer traversal then re-visits the inlined entry's own relations, so a
 * nested relation is inlined only when its own path is opted in — inline depth follows
 * the populate spec. Skips admin::user relations — those are out of scope, preserved as-is.
 */
const createShapeVisitor =
  (options?: ShapeRelationsOptions): Parameters<typeof traverseEntity>[0] =>
  async ({ key, value, attribute, path }, { set }) => {
    if (attribute?.type !== 'relation') {
      return;
    }

    const relAttr = attribute as { relation?: string; target?: string };

    // Out of scope — admin user records are preserved untouched (tracked separately).
    if (relAttr.target === 'admin::user') {
      return;
    }

    // Inline relations whose attribute path the caller opted into (nested paths included);
    // everything else is reduced to an identity stub.
    if (
      options !== undefined &&
      value !== null &&
      value !== undefined &&
      options.shouldInline(path.attribute) === true
    ) {
      const inlineEntry = async (entry: unknown): Promise<unknown> => {
        if (entry === null || typeof entry !== 'object') {
          return undefined;
        }
        const record = entry as Record<string, unknown>;
        const targetUid = resolveTargetUid(relAttr, record);
        if (targetUid === undefined) {
          return pickIdentity(record);
        }
        const sanitized = await options.inlineRelation(targetUid, record);
        // null/undefined → target not readable → fall back to identity stub
        return sanitized ?? pickIdentity(record);
      };

      if (isManyRelationForMcp(relAttr) === true) {
        const arr = Array.isArray(value) ? value : [];
        const inlined = (await Promise.all(arr.map(inlineEntry))).filter(
          (v) => v !== undefined && v !== null
        );
        // @ts-expect-error — inlined entries are plain records; traverseEntity Data allows unknown
        set(key, inlined);
        return;
      }

      const single = Array.isArray(value) ? value[0] : value;
      const inlined = (await inlineEntry(single)) ?? null;
      // @ts-expect-error — inlined entry is a plain record or null; traverseEntity Data allows unknown
      set(key, inlined);
      return;
    }

    // @ts-expect-error — reduceToIdentity returns a narrower type; traverseEntity Data allows unknown
    set(key, reduceToIdentity(relAttr, value));
  };

/**
 * Applies identity shaping to all relation fields in a document, including
 * nested fields inside components, dynamic zones, and `localizations`.
 *
 * This covers leak family #1 (relation targets) and #2 (localizations full draft rows)
 * with the same single mechanism.
 *
 * When `options` is provided, relations whose attribute path satisfies
 * `options.shouldInline` are inlined as full entries — each sanitized against the related
 * type's own read permissions via `options.inlineRelation` — instead of being reduced to a
 * stub. Nested relations are inlined only when their own path is opted in, so inline depth
 * follows the populate spec.
 */
export const shapeRelationsForMcp = async (
  uid: UID.Schema,
  data: Record<string, unknown>,
  options?: ShapeRelationsOptions
): Promise<Record<string, unknown>> => {
  return traverseEntity(
    createShapeVisitor(options),
    {
      schema: strapi.getModel(uid),
      getModel: strapi.getModel.bind(strapi),
    },
    // @ts-expect-error — traverseEntity expects Data; post-sanitize documents are compatible at runtime
    data
  );
};

// Export for unit-testing without a full strapi instance
export { reduceToIdentity, MANY_RELATION_TYPES };
