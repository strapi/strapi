import { isNil, isObject } from 'lodash/fp';

import { relations } from '@strapi/utils';

import { Relation } from './types';

const { isAnyToOne } = relations;

/**
 * "Relates to one" fields hold a single entry. If a caller passes more
 * than one, keep the last. Runs on the user-provided payload only — never
 * on the internal draft/published expansion that happens later.
 */
export const normalizeXToOneRelationValue = (attribute: any, value: Relation): Relation => {
  if (!isAnyToOne(attribute)) {
    return value;
  }

  if (isNil(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > 1) {
      return [value[value.length - 1]] as Relation;
    }
    return value;
  }

  if (isObject(value) && !Array.isArray(value)) {
    const objValue = value as { set?: any; connect?: any; disconnect?: any };
    if (Array.isArray(objValue.set) && objValue.set.length > 1) {
      return {
        ...objValue,
        set: [objValue.set[objValue.set.length - 1]],
      } as Relation;
    }
  }

  return value;
};
