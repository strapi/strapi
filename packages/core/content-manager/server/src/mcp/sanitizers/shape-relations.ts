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

type RelationIdentity = {
  documentId: string;
  locale?: string;
  __type?: string;
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
  const isMany = MANY_RELATION_TYPES.has(attribute.relation ?? '');

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
 * Post-sanitize shaping visitor.
 * Reduces every relation attribute to identity-only (documentId + locale? + __type?).
 * Skips admin::user relations — those are out of scope and preserved as-is.
 */
const shapeRelationToIdentity: Parameters<typeof traverseEntity>[0] = (
  { key, value, attribute },
  { set }
) => {
  if (attribute?.type !== 'relation') {
    return;
  }

  const target = (attribute as { target?: string }).target;

  // Out of scope — admin user records are preserved untouched (tracked separately).
  if (target === 'admin::user') {
    return;
  }

  // @ts-expect-error — reduceToIdentity returns a narrower type; traverseEntity Data allows unknown
  set(key, reduceToIdentity(attribute as { relation?: string }, value));
};

/**
 * Applies identity shaping to all relation fields in a document, including
 * nested fields inside components, dynamic zones, and `localizations`.
 *
 * This covers leak family #1 (relation targets) and #2 (localizations full draft rows)
 * with the same single mechanism.
 */
export const shapeRelationsForMcp = async (
  uid: UID.Schema,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  return traverseEntity(
    shapeRelationToIdentity,
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
