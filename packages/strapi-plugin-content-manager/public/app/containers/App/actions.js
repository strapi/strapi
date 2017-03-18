/*
 *
 * App actions
 *
 */

import {
  LOAD_MODELS,
  LOADED_MODELS
} from './constants';

export function loadModels() {
  return {
    type: LOAD_MODELS,
  };
}

export function loadedModels(models) {
  return {
    type: LOADED_MODELS,
    models
  };
}
