/* eslint-disable @typescript-eslint/no-var-requires */

import _ from 'lodash';
import fse from 'fs-extra';
import assert from 'node:assert';

import type { Logger } from '../logger';
import type { JSONObject, JSONValue, Report } from '../../types';

export interface JSONRunnerConfig {
  cwd: string;
  dry?: boolean;
  logger?: Logger;
}

export interface JSONSourceFile {
  path: string;
  json: JSONObject;
}

export interface JSONTransformParams {
  cwd: string;
  json: (object: JSONObject) => JSONTransformAPI;
}

export interface JSONTransformAPI {
  get<T extends JSONValue>(path?: string, defaultValue?: T): T | undefined;
  has(path: string): boolean;
  set(path: string, value: JSONValue): this;
  merge(other: JSONObject): this;
  root(): JSONObject;
}

export type JSONTransform = (file: JSONSourceFile, params: JSONTransformParams) => JSONObject;

// TODO: What's the actual impact of having this line here instead of inside the runner
//       - Does it impact the whole process or just the stuff in this file?
//       - If yes, is it needed to execute everything in a dedicated worker?
require('@babel/register')({
  configFile: false,
  babelrc: false,
  plugins: [],
  extensions: ['.js', '.ts'],
});

function jsonAPI<T extends JSONObject>(object: T): JSONTransformAPI {
  let json = _.cloneDeep(object) as object;

  return {
    get<TReturn extends JSONValue>(path?: string, defaultValue?: TReturn): TReturn | undefined {
      return (path ? _.get(json, path, defaultValue) : json) as TReturn;
    },

    has(path) {
      return _.has(json, path);
    },

    set(path, value) {
      _.set(json, path, value);
      return this;
    },

    merge(other) {
      _.merge(json, other);
      return this;
    },

    root() {
      return json as JSONObject;
    },
  };
}

export const transformJSON = async (
  transformFile: string,
  paths: string[],
  config: JSONRunnerConfig
): Promise<Report> => {
  const { dry } = config;
  const startTime = process.hrtime();

  const report: Report = { ok: 0, nochange: 0, skip: 0, error: 0, timeElapsed: '', stats: {} };

  const module = require(transformFile);
  const transform = typeof module.default === 'function' ? module.default : module;

  assert(
    typeof transform === 'function',
    `Transform must be a function. Found ${typeof transform}`
  );

  for (const path of paths) {
    try {
      const json = require(path);
      // TODO: Optimize the API to limit parse/stringify operations
      const file: JSONSourceFile = { path, json };
      const params: JSONTransformParams = {
        cwd: config.cwd,
        json: jsonAPI,
      };

      const out = await transform(file, params);

      // If the json object has modifications
      if (!_.isEqual(json, out)) {
        if (!dry) {
          fse.writeFileSync(path, JSON.stringify(out, null, 2));
        }
        report.ok += 1;
      }
      // No changes
      else {
        report.nochange += 1;
      }
    } catch {
      report.error += 1;
    }
  }

  const endTime = process.hrtime(startTime);
  report.timeElapsed = (endTime[0] + endTime[1] / 1e9).toFixed(3);

  return report;
};
