'use strict';

const { merge } = require('lodash/fp');
const { isVisibleAttribute } = require('@strapi/utils').contentTypes;

function getCountForRelation(attributeName, entity, model) {
  const entityAttribute = entity[attributeName];

  // do not count createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return entityAttribute;
  }

  if (Array.isArray(entityAttribute)) {
    return { count: entityAttribute.length };
  }

  return entityAttribute ? { count: 1 } : { count: 0 };
}

function getCountForDZ(attributeName, entity) {
  return entity[attributeName].map((component) => {
    return getDeepRelationsCount(component, component.__component);
  });
}

function getCountFor(attributeName, entity, model) {
  const attribute = model.attributes[attributeName];

  switch (attribute?.type) {
    case 'relation':
      return {
        [attributeName]: getCountForRelation(attributeName, entity, model),
      };
    case 'component':
      return {
        [attributeName]: getDeepRelationsCount(entity[attributeName], attribute.component),
      };
    case 'dynamiczone':
      return {
        [attributeName]: getCountForDZ(attributeName, entity),
      };
    default:
      return { [attributeName]: entity[attributeName] };
  }
}

const getDeepRelationsCount = (entity, uid) => {
  const model = strapi.getModel(uid);

  return Object.keys(entity).reduce(
    (populateAcc, attributeName) => merge(populateAcc, getCountFor(attributeName, entity, model)),
    {}
  );
};

module.exports = {
  getDeepRelationsCount,
};
