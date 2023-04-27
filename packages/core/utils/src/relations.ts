import { Attribute, Model } from './types';

import { isRelationalAttribute } from './content-types';

const MANY_RELATIONS = ['oneToMany', 'manyToMany'];

const getRelationalFields = (contentType: Model) => {
  return Object.keys(contentType.attributes).filter((attributeName) => {
    return contentType.attributes[attributeName].type === 'relation';
  });
};

const isOneToAny = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'oneToMany'].includes(attribute.relation);
const isManyToAny = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['manyToMany', 'manyToOne'].includes(attribute.relation);
const isAnyToOne = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'manyToOne'].includes(attribute.relation);
const isAnyToMany = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToMany', 'manyToMany'].includes(attribute.relation);

export const constants = {
  MANY_RELATIONS,
};

export { getRelationalFields, isOneToAny, isManyToAny, isAnyToOne, isAnyToMany };
