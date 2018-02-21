/**
 *
 * EditPage actions
 *
 */

import {
  INIT_MODEL_PROPS,
} from './constants';

export function initModelProps(modelName, isCreating) {
  return {
    type: INIT_MODEL_PROPS,
    modelName,
    isCreating,
  };
}
