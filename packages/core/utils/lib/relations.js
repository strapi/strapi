'use strict';

const { isRelationalAttribute } = require('./content-types');

const MANY_RELATIONS = ['oneToMany', 'manyToMany'];

const getRelationalFields = (contentType) => {
  return Object.keys(contentType.attributes).filter((attributeName) => {
    return contentType.attributes[attributeName].type === 'relation';
  });
};

const isOneToAny = (attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'oneToMany'].includes(attribute.relation);
const isManyToAny = (attribute) =>
  isRelationalAttribute(attribute) && ['manyToMany', 'manyToOne'].includes(attribute.relation);
const isAnyToOne = (attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'manyToOne'].includes(attribute.relation);
const isAnyToMany = (attribute) =>
  isRelationalAttribute(attribute) && ['oneToMany', 'manyToMany'].includes(attribute.relation);

module.exports = {
  getRelationalFields,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  isAnyToMany,
  constants: {
    MANY_RELATIONS,
  },
};
