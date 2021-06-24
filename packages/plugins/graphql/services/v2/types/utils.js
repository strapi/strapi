'use strict';

const { camelCase, propEq, upperFirst } = require('lodash/fp');

const { toSingular } = require('../../naming');
const { STRAPI_SCALARS } = require('./constants');

/**
 * Check if the given attribute is scalar
 * @param {object} attribute
 * @return {boolean}
 */
const isScalar = attribute => {
  return STRAPI_SCALARS.includes(attribute.type);
};

/**
 * Check if the given attribute is a polymorphic relation
 * @param {object} attribute
 * @return {boolean}
 */
const isMorphRelation = attribute => (attribute.model || attribute.collection) === '*';

/**
 * Check if the given attribute is a relation
 * @param {object} attribute
 * @return {boolean}
 */
const isRelation = attribute => !!attribute.model || !!attribute.collection;

/**
 * Check if the given attribute is an enum
 * @param {object} attribute
 * @return {boolean}
 */
const isEnumeration = propEq('type', 'enumeration');

/**
 * Check if the given attribute is a component
 * @param {object} attribute
 * @return {boolean}
 */
const isComponent = propEq('type', 'component');

/**
 * Check if the given attribute is a dynamic zone
 * @param {object} attribute
 * @return {boolean}
 */
const isDynamicZone = propEq('type', 'dynamiczone');

/**
 * Build a type name for a enum based on a content type & an attribute name
 * @param {object} contentType
 * @param {string} attributeName
 * @return {string}
 */
const getEnumName = (contentType, attributeName) => {
  const { attributes, modelName } = contentType;
  const { enumName } = attributes[attributeName];

  const defaultEnumName = `ENUM_${modelName.toUpperCase()}_${attributeName.toUpperCase()}`;

  return enumName || defaultEnumName;
};

/**
 * Build the base type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getTypeName = contentType => {
  const { plugin, modelName } = contentType;

  const transformedPlugin = upperFirst(camelCase(plugin));
  const transformedModelName = upperFirst(toSingular(modelName));

  return `${transformedPlugin}${transformedModelName}`;
};

/**
 * Build the entity's type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getEntityName = contentType => `${getTypeName(contentType)}Entity`;

/**
 * Build the entity meta type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getEntityMetaName = contentType => `${getEntityName(contentType)}Meta`;

/**
 * Build the entity response's type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getEntityResponseName = contentType => `${getEntityName(contentType)}Response`;

/**
 * Build the entity response collection's type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getEntityResponseCollectionName = contentType => {
  return `${getEntityName(contentType)}ResponseCollection`;
};

/**
 * Build a component type name based on its definition
 * @param {object} contentType
 * @return {string}
 */
const getComponentName = contentType => contentType.globalId;

/**
 * Build a component type name based on a content type's attribute
 * @param {object} attribute
 * @return {string}
 */
const getComponentNameFromAttribute = attribute => {
  return strapi.components[attribute.component].globalId;
};

/**
 * Build a dynamic zone type name based on a content type and an attribute name
 * @param {object} contentType
 * @param {string} attributeName
 * @return {string}
 */
const getDynamicZoneName = (contentType, attributeName) => {
  const { modelName } = contentType;

  return `${modelName}${upperFirst(camelCase(attributeName))}DynamicZone`;
};

/**
 * Build a dynamic zone input type name based on a content type and an attribute name
 * @param {object} contentType
 * @param {string} attributeName
 * @return {string}
 */
const getDynamicZoneInputName = (contentType, attributeName) => {
  const dzName = getDynamicZoneName(contentType, attributeName);

  return `${dzName}Input`;
};

/**
 * Build the queries type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getEntityQueriesTypeName = contentType => `${getEntityName(contentType)}Queries`;

/**
 * Build the filters type name for a given content type
 * @param {object} contentType
 * @return {string}
 */
const getFiltersInputTypeName = contentType => `${getTypeName(contentType)}FiltersInput`;

/**
 * Build a filters type name for a given GraphQL scalar type
 * @param {NexusGenScalars} scalarType
 * @return {string}
 */
const getScalarFilterInputTypeName = scalarType => `${scalarType}FilterInput`;

/**
 * Build a type name for a given content type & polymorphic attribute
 * @param {object} contentType
 * @param {string} attributeName
 * @return {string}
 */
const getMorphRelationTypeName = (contentType, attributeName) => {
  const typeName = getTypeName(contentType);
  const formattedAttr = upperFirst(camelCase(attributeName));

  return `${typeName}${formattedAttr}Morph`;
};

module.exports = {
  isMorphRelation,
  isEnumeration,
  isScalar,
  isRelation,
  isDynamicZone,
  isComponent,

  getEnumName,
  getComponentName,
  getComponentNameFromAttribute,
  getDynamicZoneName,
  getDynamicZoneInputName,
  getTypeName,
  getEntityName,
  getEntityMetaName,
  getEntityResponseName,
  getEntityResponseCollectionName,
  getEntityQueriesTypeName,
  getFiltersInputTypeName,
  getScalarFilterInputTypeName,
  getMorphRelationTypeName,
};
