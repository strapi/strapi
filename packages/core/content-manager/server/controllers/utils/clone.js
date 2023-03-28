'use strict';

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
      default:
        return attribute?.unique ?? false;
    }
  });
};

module.exports = {
  hasProhibitedCloningFields,
};
