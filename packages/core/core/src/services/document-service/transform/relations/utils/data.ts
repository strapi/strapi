import fp from 'lodash/fp.js';
import { ID, LongHand } from './types';

const { isObject } = fp;

export const isShortHand = (relation: any): relation is ID => {
  return typeof relation === 'string' || typeof relation === 'number';
};

export const isLongHand = (relation: any): relation is LongHand => {
  return isObject(relation) && ('id' in relation || 'documentId' in relation);
};
