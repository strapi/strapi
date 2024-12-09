import * as contentTypeUtils from '../../content-types';
import { throwInvalidParam } from '../utils';
import type { Visitor } from '../../traverse/factory';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations';

const ACTIONS_TO_VERIFY = ['find'];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

type MorphArray = Array<{ __type: string }>;

export default (auth: unknown): Visitor =>
  async ({ data, key, attribute, schema }) => {
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
        await handleMorphElements(elements.connect || []);
        await handleMorphElements(elements.set || []);
        await handleMorphElements(elements.disconnect || []);

        if ('options' in elements) {
          if (elements.options === null || elements.options === undefined) {
            return;
          }

          if (typeof elements.options !== 'object') {
            throwInvalidParam({ key });
          }

          const optionKeys = Object.keys(elements.options);

          // Validate each key based on its validator function
          for (const key of optionKeys) {
            if (!(key in VALID_RELATION_ORDERING_KEYS)) {
              throwInvalidParam({ key });
            }
            if (!VALID_RELATION_ORDERING_KEYS[key](elements.options[key])) {
              throwInvalidParam({ key });
            }
          }
        }
      } else {
        await handleMorphElements(elements);
      }
    };

    const handleMorphElements = async (elements: any[]) => {
      for (const element of elements) {
        const scopes = ACTIONS_TO_VERIFY.map((action) => `${element.__type}.${action}`);
        const isAllowed = await hasAccessToSomeScopes(scopes, auth);

        if (!isAllowed) {
          throwInvalidParam({ key });
        }
      }
    };

    const handleRegularRelation = async () => {
      const scopes = ACTIONS_TO_VERIFY.map((action) => `${attribute.target}.${action}`);

      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      // If the authenticated user don't have access to any of the scopes
      if (!isAllowed) {
        throwInvalidParam({ key });
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
