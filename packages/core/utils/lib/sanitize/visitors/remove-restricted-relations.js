'use strict';

module.exports = (auth, mode) => async ({ data, key, attribute }, { remove, set }) => {
  const isRelation = attribute.type === 'relation';

  if (!isRelation) {
    return;
  }

  const handleMorphRelation = async () => {
    const newMorphValue = [];

    for (const element of data[key]) {
      const scopes = ['find', 'findOne'].map(action => `${element.__type}.${action}`);
      const isAllowed = await hasAccessToSomeScopes(scopes, auth);

      if (isAllowed) {
        newMorphValue.push(element);
      }
    }

    set(key, newMorphValue);
  };

  const handleRegularRelation = async () => {
    const isTooMany = attribute.relation.endsWith('Many');

    const inputActions = ['find', 'findOne'];
    const outputActions = isTooMany ? ['find'] : ['findOne'];

    const actions = mode === 'input' ? inputActions : outputActions;
    const scopes = actions.map(action => `${attribute.target}.${action}`);

    const isAllowed = await hasAccessToSomeScopes(scopes, auth);

    // If the authenticated user don't have access to any of the scopes, then remove the field
    if (!isAllowed) {
      remove(key);
    }
  };

  const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');

  // Polymorphic relations
  if (isMorphRelation) {
    await handleMorphRelation();
  }

  // Regular relations
  else {
    await handleRegularRelation();
  }
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
