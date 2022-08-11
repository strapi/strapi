'use strict';

const ACTIONS_TO_VERIFY = ['find'];

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = require('../../content-types').constants;

module.exports =
  (auth) =>
  async ({ data, key, attribute, schema }, { remove, set }) => {
    const isRelation = attribute.type === 'relation';

    if (!isRelation) {
      return;
    }

    const handleMorphRelation = async () => {
      const newMorphValue = [];

      for (const element of data[key]) {
        const scopes = ACTIONS_TO_VERIFY.map((action) => `${element.__type}.${action}`);
        const isAllowed = await hasAccessToSomeScopes(scopes, auth);

        if (isAllowed) {
          newMorphValue.push(element);
        }
      }

      // If the new value is empty, remove the relation completely
      if (newMorphValue.length === 0) {
        remove(key);
      } else {
        set(key, newMorphValue);
      }
    };

    const handleRegularRelation = async () => {
      const scopes = ACTIONS_TO_VERIFY.map((action) => `${attribute.target}.${action}`);

      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      // If the authenticated user don't have access to any of the scopes, then remove the field
      if (!isAllowed) {
        remove(key);
      }
    };

    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');
    const isCreatorRelation = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE].includes(key);

    // Polymorphic relations
    if (isMorphRelation) {
      await handleMorphRelation();
      return;
    }

    // Creator relations
    if (isCreatorRelation && schema.options.populateCreatorFields) {
      // do nothing
      return;
    }

    // Regular relations
    await handleRegularRelation();
  };

const hasAccessToSomeScopes = async (scopes, auth) => {
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
