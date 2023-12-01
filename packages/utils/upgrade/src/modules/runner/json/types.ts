import type { Utils } from '@strapi/types';

export interface JSONRunnerConfiguration {
  dry?: boolean;
  cwd: string;
}

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export type JSONArray = Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONSourceFile {
  path: string;
  json: Utils.JSONObject;
}

export interface JSONTransformParams {
  cwd: string;
  json: (object: Utils.JSONObject) => JSONTransformAPI;
}

export interface JSONTransformAPI {
  get<T extends Utils.JSONValue>(path?: string, defaultValue?: T): T | undefined;
  has(path: string): boolean;
  set(path: string, value: Utils.JSONValue): this;
  merge(other: Utils.JSONObject): this;
  root(): Utils.JSONObject;
}
