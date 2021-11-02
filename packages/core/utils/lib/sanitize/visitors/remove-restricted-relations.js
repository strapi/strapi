'use strict';

module.exports = (auth, mode) => async ({ key, attribute }, { remove }) => {
  const isRelation = attribute.type === 'relation';

  if (!isRelation || attribute.relation.toLowerCase().startsWith('morph')) {
    return;
  }

  const isTooMany = attribute.relation.endsWith('Many');

  const inputActions = ['find', 'findOne'];
  const outputActions = isTooMany ? ['find'] : ['findOne'];

  const actions = mode === 'input' ? inputActions : outputActions;
  const scopes = actions.map(action => `${attribute.target}.${action}`);

  for (const scope of scopes) {
    try {
      await strapi.auth.verify(auth, { scope });
      // If at least one scope has been verified, then ignore the rest & return early
      return;
    } catch {
      continue;
    }
  }

  // If the authenticated user don't have access to any of the scopes, then remove the field
  remove(key);
};
