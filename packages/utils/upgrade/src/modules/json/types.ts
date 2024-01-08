import type { Utils } from '@strapi/types';

export interface JSONTransformAPI {
  get<T extends Utils.JSONValue>(path: string): T | undefined;
  get<T extends Utils.JSONValue>(path: string, defaultValue: T): T;

  has(path: string): boolean;
  set(path: string, value: Utils.JSONValue): this;
  remove(path: string): this;
  merge(other: Utils.JSONObject): this;
  root(): Utils.JSONObject;
}
