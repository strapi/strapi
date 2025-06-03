import { isBoolean } from 'lodash/fp';
import type { Attribute, Model } from './types';

import { isRelationalAttribute } from './content-types';

const MANY_RELATIONS = ['oneToMany', 'manyToMany'];

export const getRelationalFields = (contentType: Model) => {
  return Object.keys(contentType.attributes).filter((attributeName) => {
    return contentType.attributes[attributeName].type === 'relation';
  });
};

export const isOneToAny = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'oneToMany'].includes(attribute.relation);

export const isManyToAny = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['manyToMany', 'manyToOne'].includes(attribute.relation);

export const isAnyToOne = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToOne', 'manyToOne'].includes(attribute.relation);

export const isAnyToMany = (attribute: Attribute) =>
  isRelationalAttribute(attribute) && ['oneToMany', 'manyToMany'].includes(attribute.relation);

export const isPolymorphic = (attribute: any): any =>
  ['morphOne', 'morphMany', 'morphToOne', 'morphToMany'].includes(attribute.relation);

export const constants = {
  MANY_RELATIONS,
};

// Valid keys in the `options` property of relations reordering
// The value for each key must be a function that returns true if it is a valid value
export const VALID_RELATION_ORDERING_KEYS: { [key: string]: (value: any) => boolean } = {
  strict: isBoolean,
};
