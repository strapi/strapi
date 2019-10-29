'use strict';

const _ = require('lodash');

const MODEL_RELATIONS = ['oneWay', 'oneToOne', 'manyToOne'];
const COLLECTION_RELATIONS = ['manyWay', 'manyToMany', 'oneToMany'];

/**
 * Formats a component's attributes
 * @param {Object} attributes - the attributes map
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttributes = model => {
  return Object.keys(model.attributes).reduce((acc, key) => {
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
  const relation = (model.associations || []).find(
    assoc => assoc.alias === key
  );
  const { plugin } = attribute;
  let targetEntity = attribute.model || attribute.collection;

  if (plugin === 'upload' && targetEntity === 'file') {
    return {
      type: 'media',
      multiple: attribute.collection ? true : false,
      required: attribute.required ? true : false,
    };
  } else {
    return {
      nature: relation.nature,
      target: targetEntity,
      plugin: plugin || undefined,
      dominant: attribute.dominant ? true : false,
      key: attribute.via || undefined,
      columnName: attribute.columnName || undefined,
      targetColumnName: _.get(
        strapi.getModel(targetEntity, plugin),
        ['attributes', attribute.via, 'columnName'],
        undefined
      ),
      unique: attribute.unique ? true : false,
      required: attribute.required ? true : false,
    };
  }
};

const convertAttributes = attributes => {
  return Object.keys(attributes).reduce((acc, key) => {
    const attribute = attributes[key];

    if (_.has(attribute, 'type')) {
      if (attribute.type === 'media') {
        const fileModel = strapi.getModel('file', 'upload');
        if (!fileModel) return acc;

        const via = _.findKey(fileModel.attributes, { collection: '*' });
        acc[key] = {
          [attribute.multiple ? 'collection' : 'model']: 'file',
          via,
          plugin: 'upload',
          required: attribute.required ? true : false,
        };
      } else {
        acc[key] = attribute;
      }

      return acc;
    }

    if (_.has(attribute, 'target')) {
      const {
        target,
        nature,
        unique,
        plugin,
        required,
        key,
        columnName,
        dominant,
      } = attribute;

      const attr = {
        plugin: plugin ? _.trim(plugin) : undefined,
        unique: unique === true ? true : undefined,
        dominant,
        required,
        columnName,
      };

      if (MODEL_RELATIONS.includes(nature)) {
        attr.model = target;
      } else if (COLLECTION_RELATIONS.includes(nature)) {
        attr.collection = target;
      }

      if (!['manyWay', 'oneWay'].includes(nature)) {
        attr.via = key;
      }

      acc[key] = attr;
    }

    return acc;
  }, {});
};

module.exports = {
  formatAttributes,
  convertAttributes,
};
