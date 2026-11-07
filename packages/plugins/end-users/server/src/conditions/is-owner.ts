import type { Modules, UID } from '@strapi/types';

import { USER_UID } from '../constants';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The relation attributes of `uid` whose target is `target`, in the schema's order, of any relation
 * kind. Empty for a type that isn't registered. What an `attribute` param with a `relationTarget`
 * may name (the role checks read it for any condition's params).
 */
export const relationsTo = (uid: string, target: string): string[] => {
  // The registry is a plain object, so a key like `constructor` finds an inherited value: only a
  // schema that names itself by the uid counts
  const schema: unknown = strapi.contentType(uid as UID.ContentType);

  if (!isPlain(schema) || schema.uid !== uid || !isPlain(schema.attributes)) {
    return [];
  }

  return Object.entries(schema.attributes)
    .filter(
      ([, attribute]) =>
        isPlain(attribute) && attribute.type === 'relation' && attribute.target === target
    )
    .map(([name]) => name);
};

/**
 * The relation attributes of `uid` whose target is the end-user type, in the schema's order, of any
 * relation kind. A `oneToOne` without an inverse side counts (the profile's `user`, an article's
 * `author`): the boot check already refuses an inverse side on a relation to the user. Empty for a
 * type that isn't registered.
 */
export const relationsToUser = (uid: string): string[] => relationsTo(uid, USER_UID);

/**
 * The owner field of `uid` for a row's params: the one place `is-owner` (its `query`, `stamp` and
 * `lockedFields`) and the role checks name it.
 *
 * - With `params.field`: that field, when it is one of `relationsToUser(uid)`. Any other value
 *   (another relation, a scalar, a name the type doesn't have) is undefined, never a fallback: a
 *   permission that names the wrong field must not quietly use another one.
 * - Without it (missing or null): the only relation `relationsToUser(uid)` lists.
 * - Otherwise undefined, which makes `is-owner` fail closed.
 */
export const ownerField = (
  uid: string,
  params: Record<string, unknown> | undefined
): string | undefined => {
  const relations = relationsToUser(uid);
  const field = params?.field;

  if (field !== undefined && field !== null) {
    return typeof field === 'string' && relations.includes(field) ? field : undefined;
  }

  return relations.length === 1 ? relations[0] : undefined;
};

/**
 * `plugin::end-users.is-owner`: the entries whose owner field is the caller.
 *
 * - `query`: `{ <field>: { documentId: { $eq: '$user.documentId' } } }`, or false (no entry) when
 *   the owner field can't be named. Core resolves the placeholder, so Public (no user) matches
 *   nothing.
 * - `stamp`: on create, with `setOnCreate` (the default), the owner field is set to the caller. It
 *   gives nothing, and never throws, when there is no caller to stamp: core only calls it once the
 *   query holds, which it never does for Public, but the guard doesn't rely on that. With
 *   `setOnCreate: false` nothing is stamped and the body may set the owner field on create, limited
 *   only by the caller's relation-read and field rules (the owner may then be someone else).
 * - `lockedFields`: the owner field, so an owner can't hand an entry to someone else.
 */
export const isOwner = {
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  subjects: (uid: string) => relationsToUser(uid).length > 0,
  params: {
    field: { type: 'attribute', relationTarget: USER_UID },
    setOnCreate: { type: 'boolean', default: true },
  },
  query({ uid, params }) {
    const field = ownerField(uid, params);

    return field ? { [field]: { documentId: { $eq: '$user.documentId' } } } : false;
  },
  stamp({ user, uid, params }) {
    const field = ownerField(uid, params);
    const documentId = user?.documentId;

    if (!params.setOnCreate || !field || typeof documentId !== 'string' || documentId === '') {
      return null;
    }

    return { [field]: { set: [{ documentId }] } };
  },
  lockedFields({ uid, params }) {
    const field = ownerField(uid, params);

    return field ? [field] : [];
  },
  source: 'builtin',
} satisfies ContentApiConditionDefinition;
