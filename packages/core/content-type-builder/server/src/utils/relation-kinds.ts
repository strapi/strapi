import _ from 'lodash';
import type { Struct } from '@strapi/types';

type RelationInput = {
  relation?: string;
  // Content-Type Builder payloads name the other side `targetAttribute`, the saved schema
  // `inversedBy` / `mappedBy`. A hand-written payload can carry either one.
  targetAttribute?: string | null;
  inversedBy?: string | null;
  mappedBy?: string | null;
};

// A relation without a counterpart on its target is named after the relation it is saved as.
const WAY_KINDS: Record<string, string> = { oneToOne: 'oneWay', oneToMany: 'manyWay' };

/**
 * The relation kinds a content type declares it accepts, through
 * `pluginOptions['content-type-builder'].restrictRelationsTo`. `undefined` when it declares none.
 */
export const getDeclaredRelationKinds = (
  contentType: Pick<Struct.ContentTypeSchema, 'pluginOptions'> | undefined
): string[] | undefined => {
  const declared = _.get(contentType, [
    'pluginOptions',
    'content-type-builder',
    'restrictRelationsTo',
  ]);

  return Array.isArray(declared) ? declared : undefined;
};

/**
 * The kind of a relation, as the Content-Type Builder names it: a `oneToOne` / `oneToMany`
 * without a counterpart on the target is a `oneWay` / `manyWay` relation.
 */
export const getRelationKind = (attribute: RelationInput): string | undefined => {
  const { relation, targetAttribute, inversedBy, mappedBy } = attribute;

  const hasCounterpart = [targetAttribute, inversedBy, mappedBy].some((name) => !_.isNil(name));

  if (relation !== undefined && _.has(WAY_KINDS, relation) && !hasCounterpart) {
    return WAY_KINDS[relation];
  }

  return relation;
};

/**
 * Why a relation cannot point at its target, or `null` when it can.
 *
 * A target that declares `restrictRelationsTo` only accepts those kinds. That is what the admin
 * panel offers, and it is enforced here so a payload sent to the API directly cannot skip it.
 * Targets that declare nothing, and targets that do not exist yet, accept every kind.
 */
export const getRelationKindError = (
  attribute: RelationInput & { target?: string }
): string | null => {
  const { target } = attribute;

  if (!target) {
    return null;
  }

  const allowed = getDeclaredRelationKinds(
    strapi.contentTypes[target as keyof typeof strapi.contentTypes]
  );

  if (!allowed) {
    return null;
  }

  const kind = getRelationKind(attribute);

  // Without a relation there is nothing to compare, the schema reports the missing field
  if (kind === undefined || allowed.includes(kind)) {
    return null;
  }

  if (allowed.length === 0) {
    return `Relations to ${target} are not allowed`;
  }

  // oneWay and manyWay are not values a payload can carry, so say what they are saved as
  const hints = Object.entries(WAY_KINDS)
    .filter(([, way]) => allowed.includes(way))
    .map(([relation, way]) => `${way} is a ${relation} without a targetAttribute`);

  return [
    `Relations to ${target} must be one of the following kinds: ${allowed.join(', ')}`,
    hints.length > 0 ? ` (${hints.join(', ')})` : '',
  ].join('');
};
