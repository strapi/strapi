import { cloneDeep, get, has, set, merge, omit } from 'lodash/fp';

import type { Utils } from '@strapi/types';

import type { JSONTransformAPI as JSONTransformAPIInterface } from './types';

export class JSONTransformAPI implements JSONTransformAPIInterface {
  private json: Utils.JSONObject;

  constructor(json: Utils.JSONObject) {
    this.json = cloneDeep(json);
  }

  get<T extends Utils.JSONValue>(path: string): T | undefined;
  get<T extends Utils.JSONValue>(path: string, defaultValue: T): T;
  get<T extends Utils.JSONValue>(path?: string, defaultValue?: T) {
    if (!path) {
      return this.root() as T;
    }

    return cloneDeep(get(path, this.json) ?? defaultValue) as T;
  }

  has(path: string) {
    return has(path, this.json);
  }

  merge(other: Utils.JSONObject) {
    this.json = merge(other, this.json);

    return this;
  }

  root(): Utils.JSONObject {
    return cloneDeep(this.json);
  }

  set(path: string, value: Utils.JSONValue) {
    this.json = set(path, value, this.json);

    return this;
  }

  remove(path: string) {
    this.json = omit(path, this.json);
    return this;
  }
}

export const createJSONTransformAPI = (object: Utils.JSONObject) => new JSONTransformAPI(object);
