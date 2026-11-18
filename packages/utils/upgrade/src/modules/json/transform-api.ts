import { cloneDeep, get, has, merge, omit } from 'lodash';

import { objects } from '@strapi/utils';

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

    return cloneDeep(get(this.json, path) ?? defaultValue) as T;
  }

  has(path: string) {
    return has(this.json, path);
  }

  merge(other: Utils.JSONObject) {
    this.json = merge({}, other, this.json);

    return this;
  }

  root(): Utils.JSONObject {
    return cloneDeep(this.json);
  }

  set(path: string, value: Utils.JSONValue) {
    this.json = objects.set(this.json, path, value);

    return this;
  }

  remove(path: string) {
    this.json = omit(this.json, path);
    return this;
  }
}

export const createJSONTransformAPI = (object: Utils.JSONObject) => new JSONTransformAPI(object);
