'use strict';

const _ = require('lodash');

const MODEL_RELATIONS = ['oneWay', 'oneToOne', 'manyToOne'];
const COLLECTION_RELATIONS = ['manyWay', 'manyToMany', 'oneToMany'];

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

const isRelation = attribute =>
  _.has(attribute, 'target') ||
  _.has(attribute, 'model') ||
  _.has(attribute, 'collection');

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
      target: targetEntity === '*' ? targetEntity : toUID(targetEntity, plugin),
      plugin: plugin || undefined,
      dominant: attribute.dominant ? true : false,
      targetAttribute: attribute.via || undefined,
      columnName: attribute.columnName || undefined,
      targetColumnName: _.get(
        strapi.getModel(targetEntity, plugin),
        ['attributes', attribute.via, 'columnName'],
        undefined
      ),
      unique: attribute.unique ? true : false,
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
        targetAttribute,
        columnName,
        dominant,
      } = attribute;

      const attr = {
        unique: unique === true ? true : undefined,
        columnName,
      };

      const { modelName, plugin } = fromUID(target);

      attr.plugin = plugin;

      if (MODEL_RELATIONS.includes(nature)) {
        attr.model = modelName;
      } else if (COLLECTION_RELATIONS.includes(nature)) {
        attr.collection = modelName;
      }

      if (!['manyWay', 'oneWay'].includes(nature)) {
        attr.via = targetAttribute;
        attr.dominant = dominant;
      }

      acc[key] = attr;
    }

    return acc;
  }, {});
};

module.exports = {
  fromUID,
  toUID,
  hasComponent,
  isRelation,

  formatAttributes,
  formatAttribute,
  convertAttributes,
};
