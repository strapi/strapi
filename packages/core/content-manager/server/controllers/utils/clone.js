'use strict';

const { set } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');

const { isVisibleAttribute } = strapiUtils.contentTypes;

function isProhibitedRelation(model, attributeName) {
  // we don't care about createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return false;
  }

  return true;
}

const hasProhibitedCloningFields = (uid) => {
  const model = strapi.getModel(uid);

  return Object.keys(model.attributes).some((attributeName) => {
    const attribute = model.attributes[attributeName];

    switch (attribute.type) {
      case 'relation':
        return isProhibitedRelation(model, attributeName);
      case 'component':
        return hasProhibitedCloningFields(attribute.component);
      case 'dynamiczone':
        return (attribute.components || []).some((componentUID) =>
          hasProhibitedCloningFields(componentUID)
        );
      case 'uid':
        return true;
      default:
        return attribute?.unique ?? false;
    }
  });
};

/**
 * Iterates all attributes of the content type, and removes the ones that are not creatable.
 *   - If it's a relation, it sets the value to [] or null.
 *   - If it's a regular attribute, it sets the value to null.
 * When cloning, if you don't set a field it will be copied from the original entry. So we need to
 * remove the fields that the user can't create.
 */
const excludeNotCreatableFields =
  (uid, permissionChecker) =>
  (body, path = []) => {
    const model = strapi.getModel(uid);
    const canCreate = (path) => permissionChecker.can.create(null, path);

    return Object.keys(model.attributes).reduce((body, attributeName) => {
      const attribute = model.attributes[attributeName];
      const attributePath = [...path, attributeName].join('.');

      // Ignore the attribute if it's not visible
      if (!isVisibleAttribute(model, attributeName)) {
        return body;
      }

      switch (attribute.type) {
        // Relation should be empty if the user can't create it
        case 'relation': {
          if (canCreate(attributePath)) return body;
          return set(attributePath, { set: [] }, body);
        }
        // Go deeper into the component
        case 'component': {
          return excludeNotCreatableFields(attribute.component, permissionChecker)(body, [
            ...path,
            attributeName,
          ]);
        }
        // Attribute should be null if the user can't create it
        default: {
          if (canCreate(attributePath)) return body;
          return set(attributePath, null, body);
        }
      }
    }, body);
  };

module.exports = {
  hasProhibitedCloningFields,
  excludeNotCreatableFields,
};
