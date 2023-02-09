'use strict';

const { isVisibleAttribute } = require('@strapi/utils').contentTypes;

function getCountForRelation(attributeName, entity, model) {
  // do not count createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    return entity;
  }

  if (Array.isArray(entity)) {
    return { count: entity.length };
  }

  return entity ? { count: 1 } : { count: 0 };
}

function getCountForDZ(entity) {
  return entity.map((component) => {
    return getDeepRelationsCount(component, component.__component);
  });
}

function getCountFor(attributeName, entity, model) {
  const attribute = model.attributes[attributeName];

  switch (attribute?.type) {
    case 'relation':
      return getCountForRelation(attributeName, entity, model);
    case 'component':
      if (!entity) return null;
      if (attribute.repeatable) {
        return entity.map((component) => getDeepRelationsCount(component, attribute.component));
      }
      return getDeepRelationsCount(entity, attribute.component);
    case 'dynamiczone':
      return getCountForDZ(entity);
    default:
      return entity;
  }
}

const getDeepRelationsCount = (entity, uid) => {
  const model = strapi.getModel(uid);

  return Object.keys(entity).reduce(
    (relationCountEntity, attributeName) =>
      Object.assign(relationCountEntity, {
        [attributeName]: getCountFor(attributeName, entity[attributeName], model),
      }),
    {}
  );
};

module.exports = {
  getDeepRelationsCount,
};
