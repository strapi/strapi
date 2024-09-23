import { isArray, isObject } from 'lodash/fp';
import * as contentTypeUtils from '../../content-types';
import type { Visitor } from '../../traverse/factory';
import { RelationOrderingOptions } from '../../types';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations';

const ACTIONS_TO_VERIFY = ['find'];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

type MorphArray = Array<{ __type: string }>;

export default (auth: unknown): Visitor =>
  async ({ data, key, attribute, schema }, { remove, set }) => {
    if (!attribute) {
      return;
    }

    const isRelation = attribute.type === 'relation';

    if (!isRelation) {
      return;
    }

    const handleMorphRelation = async () => {
      const elements: any = (data as Record<string, MorphArray>)[key];

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
        }

        set(key, newValue);
      } else {
        const newMorphValue = await handleMorphElements(elements);

        // If the new value is empty, remove the relation completely
        if (newMorphValue.length === 0) {
          remove(key);
        } else {
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

const hasAccessToSomeScopes = async (scopes: string[], auth: unknown) => {
  for (const scope of scopes) {
    try {
      await strapi.auth.verify(auth, { scope });
      return true;
    } catch {
      continue;
    }
  }

  return false;
};
