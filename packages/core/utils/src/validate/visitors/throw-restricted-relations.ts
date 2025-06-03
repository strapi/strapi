import { isArray, isObject } from 'lodash/fp';
import * as contentTypeUtils from '../../content-types';
import { throwInvalidKey } from '../utils';
import type { Visitor } from '../../traverse/factory';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations';

const ACTIONS_TO_VERIFY = ['find'];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

type MorphArray = Array<{ __type: string }>;

export default (auth: unknown): Visitor =>
  async ({ data, key, attribute, schema, path }) => {
    if (!attribute) {
      return;
    }

    const isRelation = attribute.type === 'relation';

    if (!isRelation) {
      return;
    }

    const handleMorphRelation = async () => {
      const elements: any = (data as Record<string, MorphArray>)[key];

      if (
        'connect' in elements ||
        'set' in elements ||
        'disconnect' in elements ||
        'options' in elements
      ) {
        await handleMorphElements(elements.connect || []);
        await handleMorphElements(elements.set || []);
        await handleMorphElements(elements.disconnect || []);

        // TODO: this should technically be in its own visitor to check morph options, but for now we'll handle it here
        if ('options' in elements) {
          if (elements.options === null || elements.options === undefined) {
            return;
          }

          if (typeof elements.options !== 'object') {
            throwInvalidKey({ key, path: path.attribute });
          }

          const optionKeys = Object.keys(elements.options);

          // Validate each key based on its validator function
          for (const key of optionKeys) {
            if (!(key in VALID_RELATION_ORDERING_KEYS)) {
              throwInvalidKey({ key, path: path.attribute });
            }
            if (!VALID_RELATION_ORDERING_KEYS[key](elements.options[key])) {
              throwInvalidKey({ key, path: path.attribute });
            }
          }
        }
      } else {
        await handleMorphElements(elements);
      }
    };

    const handleMorphElements = async (elements: any[]) => {
      if (!isArray(elements)) {
        throwInvalidKey({ key, path: path.attribute });
      }

      for (const element of elements) {
        if (!isObject(element) || !('__type' in element)) {
          throwInvalidKey({ key, path: path.attribute });
        }

        const scopes = ACTIONS_TO_VERIFY.map((action) => `${element.__type}.${action}`);
        const isAllowed = await hasAccessToSomeScopes(scopes, auth);

        if (!isAllowed) {
          throwInvalidKey({ key, path: path.attribute });
        }
      }
    };

    const handleRegularRelation = async () => {
      const scopes = ACTIONS_TO_VERIFY.map((action) => `${attribute.target}.${action}`);

      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      // If the authenticated user don't have access to any of the scopes
      if (!isAllowed) {
        throwInvalidKey({ key, path: path.attribute });
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
