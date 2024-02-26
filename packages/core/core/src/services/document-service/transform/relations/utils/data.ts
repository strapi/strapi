import { isObject } from 'lodash/fp';
import { ID } from './types';

export const isShortHand = (relation: any): relation is ID => {
  return typeof relation === 'string' || typeof relation === 'number';
};

export const isLongHand = (relation: any): relation is { id: ID } => {
  return isObject(relation) && 'id' in relation;
};
