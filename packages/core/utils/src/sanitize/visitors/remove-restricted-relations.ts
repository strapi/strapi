import { isArray, isObject } from 'lodash/fp';
import * as contentTypeUtils from '../../content-types';
import type { Model, RelationOrderingOptions } from '../../types';
import type { Visitor } from '../../traverse/factory';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations';

const ACTIONS_TO_VERIFY = ['find'];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

type MorphArray = Array<{ __type: string }>;
type MorphElement = Record<string, unknown> & { __type: string };
type MorphMutationPayload = {
  connect?: unknown;
  set?: unknown;
  disconnect?: unknown;
  options?: Record<string, unknown> | null;
};
type MorphPopulatePayload = {
  on: Record<string, unknown>;
  count?: unknown;
};

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
    const elements = (data as Record<string, MorphArray | MorphElement | MorphMutationPayload>)[
      key
    ];

    if (!elements) {
      return;
    }

    if (isMorphMutationPayload(elements)) {
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
      const options = elements.options;
      if (options && typeof options === 'object') {
        const filteredOptions: RelationOrderingOptions = {};

        Object.keys(options).forEach((key) => {
          const optionKey = key as keyof RelationOrderingOptions;
          const validator = VALID_RELATION_ORDERING_KEYS[optionKey];
          const optionValue = options[key];

          if (validator && validator(optionValue)) {
            filteredOptions[optionKey] = optionValue as RelationOrderingOptions[typeof optionKey];
          }
        });

        newValue.options = filteredOptions;
      } else {
        newValue.options = {};
      }

      set(key, newValue);
    } else if (isMorphPopulatePayload(elements)) {
      const newOn: Record<string, unknown> = {};

      for (const [uid, subPopulate] of Object.entries(elements.on)) {
        const scopes = ACTIONS_TO_VERIFY.map((action) => `${uid}.${action}`);
        const isAllowed = await hasAccessToSomeScopes(scopes, auth);

        if (isAllowed) {
          newOn[uid] = subPopulate;
        }
      }

      if (Object.keys(newOn).length === 0) {
        remove(key);
        return;
      }

      const count = isMorphPopulateCount(elements.count) ? true : elements.count;
      set(key, { ...elements, count, on: newOn });
    } else {
      const newMorphValue = await handleMorphElements(elements);

      if (!newMorphValue.length) {
        if (isArray(elements) && elements.length === 0) {
          return;
        }

        remove(key);
        return;
      }

      if (isArray(elements)) {
        set(key, newMorphValue);
        return;
      }

      set(key, newMorphValue[0]);
    }
  };

  const isMorphMutationPayload = (value: unknown): value is MorphMutationPayload => {
    return isObject(value) && ('connect' in value || 'set' in value || 'disconnect' in value);
  };

  const isMorphPopulateCount = (value: unknown) => value === true || value === 'true';

  const isMorphPopulatePayload = (value: unknown): value is MorphPopulatePayload => {
    return isObject(value) && !('__type' in value) && 'on' in value && isObject(value.on);
  };

  const buildAllowedMorphPopulateFragment = async (subPopulate: unknown) => {
    const newOn: Record<string, unknown> = {};

    for (const uid of getRegisteredContentTypeUIDs()) {
      const scopes = ACTIONS_TO_VERIFY.map((action) => `${uid}.${action}`);
      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      if (isAllowed) {
        newOn[uid] = subPopulate;
      }
    }

    return newOn;
  };

  const isMorphPopulateAllOrCount = (value: unknown): value is true | 'true' | { count: true } => {
    return (
      value === true ||
      value === 'true' ||
      (isObject(value) && 'count' in value && isMorphPopulateCount(value.count) && !('on' in value))
    );
  };

  const isMorphCountOutput = (value: unknown): value is { count: number } => {
    return (
      isObject(value) &&
      'count' in value &&
      typeof value.count === 'number' &&
      Object.keys(value).length === 1
    );
  };

  const handleMorphElements = async (elements: unknown) => {
    const allowedElements: Record<string, unknown>[] = [];
    const elementsToCheck = isArray(elements) ? elements : [elements];

    for (const element of elementsToCheck) {
      if (!isObject(element) || !('__type' in element) || typeof element.__type !== 'string') {
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

    if (!isAllowed) {
      remove(key);
    }
  };

  const isCreatorRelation = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE].includes(key);

  if (contentTypeUtils.isMorphToRelationalAttribute(attribute)) {
    const value = (data as Record<string, unknown>)[key];

    if (isMorphPopulatePayload(value)) {
      await handleMorphRelation();
      return;
    }

    if (isMorphPopulateAllOrCount(value)) {
      const newOn = await buildAllowedMorphPopulateFragment(true);

      if (Object.keys(newOn).length === 0) {
        remove(key);
        return;
      }

      set(
        key,
        value === true || value === 'true' ? { on: newOn } : { ...value, count: true, on: newOn }
      );
      return;
    }

    if (isMorphCountOutput(value)) {
      return;
    }

    await handleMorphRelation();
    return;
  }

  if (isCreatorRelation && schema.options?.populateCreatorFields) {
    return;
  }

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

const getRegisteredContentTypeUIDs = () => {
  return (Object.values(strapi.contentTypes ?? {}) as Model[])
    .map((model) => model.uid)
    .filter((uid): uid is string => typeof uid === 'string');
};
