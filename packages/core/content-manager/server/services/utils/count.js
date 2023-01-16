'use strict';

const { merge } = require('lodash/fp');

function getCountForRelation(entity, attributeName) {
  const entityAttribute = entity[attributeName];

  // Check if is an array? what happens if its a one to one relation?
  if (Array.isArray(entityAttribute)) {
    return { count: entityAttribute.length };
  }

  return entityAttribute;
}

function getCountForDZ(attributeName, entity) {
  return entity[attributeName].map((component) => {
    return getDeepRelationsCount(component, component.__component);
  });
}

function getCountFor(attributeName, entity, model) {
  const attribute = model.attributes[attributeName];

  // Check if attribute is empty
  if (!entity[attributeName]) {
    return { [attributeName]: entity[attributeName] };
  }

  switch (attribute?.type) {
    case 'relation':
      return {
        [attributeName]: getCountForRelation(entity, attributeName),
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
