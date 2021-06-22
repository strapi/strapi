'use strict';

const { camelCase, propEq, upperFirst } = require('lodash/fp');

const { toSingular } = require('../../naming');
const { strapiTypeToGraphQLScalar } = require('./mappers');

const isScalar = attribute => {
  return Object.keys(strapiTypeToGraphQLScalar).includes(attribute.type);
};

const isRelation = attribute => !!attribute.model;

const isEnumeration = propEq('type', 'enumeration');

const isComponent = propEq('type', 'component');

const isDynamicZone = propEq('type', 'dynamiczone');

const getEnumName = (contentType, attributeName) => {
  const { attributes, modelName } = contentType;
  const { enumName } = attributes[attributeName];

  const defaultEnumName = `ENUM_${modelName.toUpperCase()}_${attributeName.toUpperCase()}`;

  return enumName || defaultEnumName;
};

const getTypeName = contentType => {
  const { plugin, modelName } = contentType;

  const transformedPlugin = upperFirst(camelCase(plugin));
  const transformedModelName = upperFirst(toSingular(modelName));

  return `${transformedPlugin}${transformedModelName}`;
};

const getEntityName = contentType => `${getTypeName(contentType)}Entity`;

const getEntityMetaName = contentType => `${getEntityName(contentType)}Meta`;

const getEntityResponseName = contentType => `${getEntityName(contentType)}Response`;

const getEntityResponseCollectionName = contentType => {
  return `${getEntityName(contentType)}ResponseCollection`;
};

const getComponentName = (contentType, attributeName) => {
  const componentUID = contentType.attributes[attributeName].component;
  return strapi.components[componentUID].globalId;
};

const getDynamicZoneName = (contentType, attributeName) => {
  const { modelName } = contentType;

  return `${modelName}${upperFirst(camelCase(attributeName))}DynamicZone`;
};

const getDynamicZoneInputName = (contentType, attributeName) => {
  const dzName = getDynamicZoneName(contentType, attributeName);

  return `${dzName}Input`;
};

const getEntityQueriesTypeName = contentType => `${getEntityName(contentType)}Queries`;

const getFiltersInputTypeName = contentType => `${getTypeName(contentType)}FiltersInput`;

const getScalarFilterInputTypeName = scalarType => `${scalarType}FilterInput`;

module.exports = {
  isEnumeration,
  isScalar,
  isRelation,
  isDynamicZone,
  isComponent,

  getEnumName,
  getComponentName,
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
};
