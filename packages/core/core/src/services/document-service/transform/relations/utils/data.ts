import { isObject } from 'lodash/fp';
import { ID, LongHand } from './types';

export const isShortHand = (relation: any): relation is ID => {
  return typeof relation === 'string' || typeof relation === 'number';
};

export const isLongHand = (relation: any): relation is LongHand => {
  return isObject(relation) && ('id' in relation || 'documentId' in relation);
};
