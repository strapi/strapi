import { isUndefined } from 'lodash/fp';

import type { Attribute } from '../types';

/**
 * Returns the configured default for a scalar attribute, matching create-time behavior
 * in entity-manager/processData (skips functions and empty strings).
 */
export const getScalarAttributeDefault = (attribute: Attribute): unknown | undefined => {
  if (!('default' in attribute) || isUndefined(attribute.default)) {
    return undefined;
  }

  if (typeof attribute.default === 'function' || attribute.default === '') {
    return undefined;
  }

  return attribute.default;
};
