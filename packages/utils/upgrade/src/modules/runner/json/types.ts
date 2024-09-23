import type { Utils } from '@strapi/types';

import type { JSONTransformAPI } from '../../json';

export interface JSONRunnerConfiguration {
  dry?: boolean;
  cwd: string;
}

export interface JSONSourceFile {
  path: string;
  json: Utils.JSONObject;
}

export interface JSONTransformParams {
  cwd: string;
  json: (object: Utils.JSONObject) => JSONTransformAPI;
}

export type JSONTransform = (file: JSONSourceFile, params: JSONTransformParams) => Utils.JSONObject;
