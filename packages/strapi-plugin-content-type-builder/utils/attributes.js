'use strict';

const _ = require('lodash');
const utils = require('strapi-utils');
const { isMediaAttribute } = require('strapi-utils').contentTypes;

const toUID = (name, plugin) => {
  const modelUID = Object.keys(strapi.contentTypes).find(key => {
    const ct = strapi.contentTypes[key];
    if (ct.modelName === name && ct.plugin === plugin) return true;
  });

  return modelUID;
};

const fromUID = uid => {
  const contentType = strapi.contentTypes[uid];
  const { modelName, plugin } = contentType;

  return { modelName, plugin };
};

const hasComponent = model => {
  const compoKeys = Object.keys(model.attributes || {}).filter(key => {
    return model.attributes[key].type === 'component';
  });

  return compoKeys.length > 0;
};

const isConfigurable = attribute => _.get(attribute, 'configurable', true);

const isRelation = attribute =>
  _.has(attribute, 'target') || _.has(attribute, 'model') || _.has(attribute, 'collection');

/**
 * Formats a component's attributes
 * @param {Object} attributes - the attributes map
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttributes = model => {
  const { getVisibleAttributes } = utils.contentTypes;

  // only get attributes that can be seen in the CTB
  return getVisibleAttributes(model).reduce((acc, key) => {
    acc[key] = formatAttribute(key, model.attributes[key], { model });
    return acc;
  }, {});
};

/**
 * Fromats a component attribute
 * @param {string} key - the attribute key
 * @param {Object} attribute - the attribute
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttribute = (key, attribute, { model }) => {
  if (_.has(attribute, 'type')) return attribute;

  // format relations
  const relation = (model.associations || []).find(assoc => assoc.alias === key);
  const { plugin, configurable } = attribute;
  let targetEntity = attribute.model || attribute.collection;

  if (isMediaAttribute(attribute)) {
    return {
      type: 'media',
      multiple: attribute.collection ? true : false,
      required: attribute.required ? true : false,
      configurable: configurable === false ? false : undefined,
      allowedTypes: attribute.allowedTypes,
      pluginOptions: attribute.pluginOptions,
    };
  } else {
    return {
      nature: relation.nature,
      target: targetEntity === '*' ? targetEntity : toUID(targetEntity, plugin),
      plugin: plugin || undefined,
      dominant: attribute.dominant ? true : false,
      targetAttribute: attribute.via || undefined,
      columnName: attribute.columnName || undefined,
      configurable: configurable === false ? false : undefined,
      targetColumnName: _.get(
        strapi.getModel(targetEntity, plugin),
        ['attributes', attribute.via, 'columnName'],
        undefined
      ),
      private: attribute.private ? true : false,
      unique: attribute.unique ? true : false,
      autoPopulate: attribute.autoPopulate,
      pluginOptions: attribute.pluginOptions,
    };
  }
};

// TODO: move to schema builder
const replaceTemporaryUIDs = uidMap => schema => {
  return {
    ...schema,
    attributes: Object.keys(schema.attributes).reduce((acc, key) => {
      const attr = schema.attributes[key];
      if (attr.type === 'component') {
        if (_.has(uidMap, attr.component)) {
          acc[key] = {
            ...attr,
            component: uidMap[attr.component],
          };

          return acc;
        }

        if (!_.has(strapi.components, attr.component)) {
          throw new Error('component.notFound');
        }
      }

      if (
        attr.type === 'dynamiczone' &&
        _.intersection(attr.components, Object.keys(uidMap)).length > 0
      ) {
        acc[key] = {
          ...attr,
          components: attr.components.map(value => {
            if (_.has(uidMap, value)) return uidMap[value];

            if (!_.has(strapi.components, value)) {
              throw new Error('component.notFound');
            }

            return value;
          }),
        };

        return acc;
      }

      acc[key] = attr;
      return acc;
    }, {}),
  };
};

module.exports = {
  fromUID,
  toUID,
  hasComponent,
  isRelation,
  isConfigurable,
  replaceTemporaryUIDs,
  formatAttributes,
  formatAttribute,
};
