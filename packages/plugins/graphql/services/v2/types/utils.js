'use strict';

const { propEq, upperFirst } = require('lodash/fp');

const { toSingular } = require('../../naming');
const { strapiTypeToGraphQLScalar } = require('./mappers');

const isScalar = attribute => {
  return Object.keys(strapiTypeToGraphQLScalar).includes(attribute.type);
};

const isRelation = attribute => !!attribute.model;

const isEnumeration = propEq('type', 'enumeration');

const getEnumName = (contentType, attributeName) => {
  const { attributes, modelName } = contentType;
  const { enumName } = attributes[attributeName];

  const defaultEnumName = `ENUM_${modelName.toUpperCase()}_${attributeName.toUpperCase()}`;

  return enumName || defaultEnumName;
};

const getTypeName = contentType => upperFirst(toSingular(contentType.modelName));

const getEntityName = contentType => `${getTypeName(contentType)}Entity`;

const getEntityMetaName = contentType => `${getEntityName(contentType)}Meta`;

module.exports = {
  isEnumeration,
  isScalar,
  isRelation,

  getEnumName,
  getTypeName,
  getEntityName,
  getEntityMetaName,
};
