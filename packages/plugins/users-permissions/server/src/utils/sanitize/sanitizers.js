'use strict';

const { curry, isObject } = require('lodash');
const { traverseEntity } = require('@strapi/utils');

const { removeUserRelationFromRoleEntities } = require('./visitors');

const getTargetModel = (getModel, attribute, value) => {
  switch (attribute.type) {
    case 'relation':
      if (attribute.relation.toLowerCase().startsWith('morph')) {
        return value.__type ? getModel(value.__type) : undefined;
      }
      return getModel(attribute.target);
    case 'media':
      return getModel('plugin::upload.file');
    case 'component':
      return getModel(attribute.component);
    case 'dynamiczone':
      return value.__component ? getModel(value.__component) : undefined;
    default:
      return undefined;
  }
};

const hasRoleUsersRelation = (schema, entity, getModel) => {
  if (!isObject(entity) || schema == null) {
    return false;
  }

  for (const key of Object.keys(entity)) {
    const attribute = schema.attributes[key];

    if (attribute == null) {
      continue;
    }

    let found = false;
    removeUserRelationFromRoleEntities(
      { schema, key, attribute },
      {
        remove() {
          found = true;
        },
      }
    );

    if (found) {
      return true;
    }

    const value = entity[key];
    const items = Array.isArray(value) ? value : [value];

    for (const item of items) {
      if (!isObject(item)) {
        continue;
      }

      const model = getTargetModel(getModel, attribute, item);

      if (hasRoleUsersRelation(model, item, getModel)) {
        return true;
      }
    }
  }

  return false;
};

const sanitizeUserRelationFromRoleEntities = curry((schema, entity) => {
  const getModel = strapi.getModel.bind(strapi);

  if (!hasRoleUsersRelation(schema, entity, getModel)) {
    return Promise.resolve(entity);
  }

  return traverseEntity(removeUserRelationFromRoleEntities, { schema, getModel }, entity);
});

const defaultSanitizeOutput = curry((schema, entity) => {
  return sanitizeUserRelationFromRoleEntities(schema, entity);
});

module.exports = {
  sanitizeUserRelationFromRoleEntities,
  defaultSanitizeOutput,
};
