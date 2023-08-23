'use strict';

const _ = require('lodash');
const { intersection } = require('lodash/fp');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');

const { getNonVisibleAttributes, getWritableAttributes } = contentTypesUtils;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } =
  contentTypesUtils.constants;

const NON_SORTABLES = ['component', 'json', 'media', 'richtext', 'dynamiczone'];
const SORTABLE_RELATIONS = ['oneToOne', 'manyToOne'];

const NON_LISTABLES = ['json', 'password', 'richtext', 'dynamiczone'];
const LISTABLE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];

// hidden fields are fields that are configured to be hidden from list, and edit views
const isHidden = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  const isHidden = _.get(schema, ['config', 'attributes', name, 'hidden'], false);
  if (isHidden === true) {
    return true;
  }

  return false;
};

const isListable = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (isHidden(schema, name)) {
    return false;
  }

  const attribute = schema.attributes[name];
  if (NON_LISTABLES.includes(attribute.type)) {
    return false;
  }

  if (isRelation(attribute) && !LISTABLE_RELATIONS.includes(attribute.relationType)) {
    return false;
  }

  return true;
};

const isSortable = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (schema.modelType === 'component' && name === 'id') return false;

  const attribute = schema.attributes[name];
  if (NON_SORTABLES.includes(attribute.type)) {
    return false;
  }

  if (isRelation(attribute) && !SORTABLE_RELATIONS.includes(attribute.relationType)) {
    return false;
  }

  return true;
};

const isSearchable = (schema, name) => {
  return isSortable(schema, name);
};

const isVisible = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (isHidden(schema, name)) {
    return false;
  }

  if (isTimestamp(schema, name) || name === 'id') {
    return false;
  }

  if (isPublicationField(name)) {
    return false;
  }

  if (isCreatorField(schema, name)) {
    return false;
  }

  return true;
};

const isPublicationField = (name) => {
  return PUBLISHED_AT_ATTRIBUTE === name;
};

const isTimestamp = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  const timestamps = contentTypesUtils.getTimestamps(schema);
  if (!timestamps || !Array.isArray(timestamps)) {
    return false;
  }

  if (timestamps.includes(name)) {
    return true;
  }
};

const isCreatorField = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  const creatorFields = contentTypesUtils.getCreatorFields(schema);
  if (!creatorFields || !Array.isArray(creatorFields)) {
    return false;
  }

  if (creatorFields.includes(name)) {
    return true;
  }
};

const isRelation = (attribute) => attribute.type === 'relation';

const hasRelationAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (isHidden(schema, name)) {
    return false;
  }

  if (!isVisible(schema, name)) {
    return false;
  }

  return isRelation(schema.attributes[name]);
};

const hasEditableAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (isHidden(schema, name)) {
    return false;
  }

  if (!isVisible(schema, name)) {
    return false;
  }

  return true;
};

const findFirstStringAttribute = (schema) => {
  return Object.keys(schema.attributes || {}).find((key) => {
    const { type } = schema.attributes[key];
    return type === 'string' && key !== 'id';
  });
};

const getDefaultMainField = (schema) => findFirstStringAttribute(schema) || 'id';

/**
 * Returns list of all sortable attributes for a given content type schema
 * TODO V5: Refactor non visible fields to be a part of content-manager schema so we can use isSortable instead
 * @param {*} schema
 * @returns
 */
const getSortableAttributes = (schema) => {
  const validAttributes = Object.keys(schema.attributes).filter((key) => isListable(schema, key));

  const model = strapi.getModel(schema.uid);
  const nonVisibleWritableAttributes = intersection(
    getNonVisibleAttributes(model),
    getWritableAttributes(model)
  );

  return [
    'id',
    ...validAttributes,
    ...nonVisibleWritableAttributes,
    CREATED_BY_ATTRIBUTE,
    UPDATED_BY_ATTRIBUTE,
  ];
};

module.exports = {
  isSortable,
  isVisible,
  isSearchable,
  isRelation,
  isListable,
  hasEditableAttribute,
  hasRelationAttribute,
  getDefaultMainField,
  getSortableAttributes,
};
