/**
 *
 * AdminPage actions
 *
 */

import {
  GET_UPLOAD_ENV,
  GET_UPLOAD_ENV_SUCCEEDED,
} from './constants';

export function getUploadEnv() {
  return {
    type: GET_UPLOAD_ENV,
  };
}

export function getUploadEnvSucceeded(env) {
  return {
    type: GET_UPLOAD_ENV_SUCCEEDED,
    data: env.environments,
  };
}
