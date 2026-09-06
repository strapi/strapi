import { isArray, isObject } from 'lodash/fp';
import * as contentTypeUtils from '../../content-types';
import type { Visitor } from '../../traverse/factory';
import { RelationOrderingOptions } from '../../types';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations';

const ACTIONS_TO_VERIFY = ['find'];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

type MorphArray = Array<{ __type: string }>;

export default (auth: unknown): Visitor =>
  (visitorOptions, visitorUtils) => {
    const { attribute } = visitorOptions;

    // Deliberately not an `async` function. This visitor is invoked for every key of
    // every node of every entity, and only relation attributes need any work at all.
    // Declaring it `async` meant each of those keys allocated a promise purely to
    // resolve it immediately, and the traversal then awaited it. Returning early
    // without a promise lets the traversal stay synchronous for the common case.
    if (!attribute || attribute.type !== 'relation') {
      return;
    }

    return visitRelationAttribute(auth, visitorOptions, visitorUtils) as unknown as void;
  };

const visitRelationAttribute = async (
  auth: unknown,
  { data, key, attribute, schema }: Parameters<Visitor>[0],
  { remove, set }: Parameters<Visitor>[1]
) => {
  // Narrowing only; the caller reaches this for relation attributes exclusively.
  if (!attribute) {
    return;
  }

  const handleMorphRelation = async () => {
    const elements: any = (data as Record<string, MorphArray>)[key];

    if (!elements) {
      return;
    }

    if ('connect' in elements || 'set' in elements || 'disconnect' in elements) {
      const newValue: Record<string, unknown> = {};

      const connect = await handleMorphElements(elements.connect || []);
      const relSet = await handleMorphElements(elements.set || []);
      const disconnect = await handleMorphElements(elements.disconnect || []);

      if (connect.length > 0) {
        newValue.connect = connect;
      }

      if (relSet.length > 0) {
        newValue.set = relSet;
      }

      if (disconnect.length > 0) {
        newValue.disconnect = disconnect;
      }

      // TODO: this should technically be in its own visitor to check morph options, but for now we'll handle it here
      if (
        'options' in elements &&
        typeof elements.options === 'object' &&
        elements.options !== null
      ) {
        const filteredOptions: RelationOrderingOptions = {};

        // Iterate through the keys of elements.options
        Object.keys(elements.options).forEach((key) => {
          const validator = VALID_RELATION_ORDERING_KEYS[key as keyof RelationOrderingOptions];

          // Ensure the key exists in VALID_RELATION_ORDERING_KEYS and the validator is defined before calling it
          if (validator && validator(elements.options[key])) {
            filteredOptions[key as keyof RelationOrderingOptions] = elements.options[key];
          }
        });

        // Assign the filtered options back to newValue
        newValue.options = filteredOptions;
      } else {
        newValue.options = {};
      }

      set(key, newValue);
    } else {
      const newMorphValue = await handleMorphElements(elements);

      if (newMorphValue.length) {
        set(key, newMorphValue);
      }
    }
  };

  const handleMorphElements = async (elements: any[]) => {
    const allowedElements: Record<string, unknown>[] = [];

    if (!isArray(elements)) {
      return allowedElements;
    }

    for (const element of elements) {
      if (!isObject(element) || !('__type' in element)) {
        continue;
      }

      const scopes = ACTIONS_TO_VERIFY.map((action) => `${element.__type}.${action}`);
      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      if (isAllowed) {
        allowedElements.push(element);
      }
    }

    return allowedElements;
  };

  const handleRegularRelation = async () => {
    const scopes = ACTIONS_TO_VERIFY.map((action) => `${attribute.target}.${action}`);

    const isAllowed = await hasAccessToSomeScopes(scopes, auth);

    // If the authenticated user don't have access to any of the scopes, then remove the field
    if (!isAllowed) {
      remove(key);
    }
  };

  const isCreatorRelation = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE].includes(key);

  // Polymorphic relations
  if (contentTypeUtils.isMorphToRelationalAttribute(attribute)) {
    await handleMorphRelation();
    return;
  }

  // Creator relations
  if (isCreatorRelation && schema.options?.populateCreatorFields) {
    // do nothing
    return;
  }

  // Regular relations
  await handleRegularRelation();
};

/**
 * Per-`auth` memo of scope decisions.
 *
 * The decision for a given scope depends only on the ability carried by `auth`, which is
 * built once per request and not mutated while the response is sanitized. Sanitizing a
 * list re-asks the same question for every entity, so a 25-entity page with four
 * relations asked ~100 identical questions; each denial also constructed an Error, and
 * capturing a stack trace is by far the most expensive part of that.
 *
 * Keyed weakly on the `auth` object so entries are collected with the request.
 */
const scopeDecisionCache = new WeakMap<object, Map<string, boolean>>();

const canAccessScope = async (scope: string, auth: unknown): Promise<boolean> => {
  const cacheable = typeof auth === 'object' && auth !== null;

  let decisions: Map<string, boolean> | undefined;

  if (cacheable) {
    decisions = scopeDecisionCache.get(auth as object);

    if (decisions === undefined) {
      decisions = new Map();
      scopeDecisionCache.set(auth as object, decisions);
    } else {
      const cached = decisions.get(scope);
      if (cached !== undefined) {
        return cached;
      }
    }
  }

  let allowed: boolean;
  try {
    await strapi.auth.verify(auth, { scope });
    allowed = true;
  } catch {
    allowed = false;
  }

  decisions?.set(scope, allowed);

  return allowed;
};

const hasAccessToSomeScopes = async (scopes: string[], auth: unknown) => {
  for (const scope of scopes) {
    if (await canAccessScope(scope, auth)) {
      return true;
    }
  }

  return false;
};
