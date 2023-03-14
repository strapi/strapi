'use strict';

const _ = require('lodash');
const utils = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;

const hasComponent = (model) => {
  const compoKeys = Object.keys(model.attributes || {}).filter((key) => {
    return model.attributes[key].type === 'component';
  });

  return compoKeys.length > 0;
};

const isConfigurable = (attribute) => _.get(attribute, 'configurable', true);

const isRelation = (attribute) => attribute.type === 'relation';

/**
 * Formats a component's attributes
 * @param {Object} attributes - the attributes map
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttributes = (model) => {
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
const formatAttribute = (key, attribute) => {
  const { configurable, required, autoPopulate, pluginOptions } = attribute;

  if (attribute.type === 'media') {
    return {
      type: 'media',
      multiple: !!attribute.multiple,
      required: !!required,
      configurable: configurable === false ? false : undefined,
      private: !!attribute.private,
      allowedTypes: attribute.allowedTypes,
      pluginOptions,
    };
  }

  if (attribute.type === 'relation') {
    return {
      ...attribute,
      type: 'relation',
      target: attribute.target,
      targetAttribute: attribute.inversedBy || attribute.mappedBy || null,
      configurable: configurable === false ? false : undefined,
      private: !!attribute.private,
      pluginOptions,
      // TODO: remove
      autoPopulate,
    };
  }

  return attribute;
};

// TODO: move to schema builder
const replaceTemporaryUIDs = (uidMap) => (schema) => {
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
          throw new ApplicationError('component.notFound');
        }
      }

      if (
        attr.type === 'dynamiczone' &&
        _.intersection(attr.components, Object.keys(uidMap)).length > 0
      ) {
        acc[key] = {
          ...attr,
          components: attr.components.map((value) => {
            if (_.has(uidMap, value)) return uidMap[value];

            if (!_.has(strapi.components, value)) {
              throw new ApplicationError('component.notFound');
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
  hasComponent,
  isRelation,
  isConfigurable,
  replaceTemporaryUIDs,
  formatAttributes,
  formatAttribute,
};
