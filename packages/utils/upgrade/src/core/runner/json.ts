/* eslint-disable @typescript-eslint/no-var-requires */

import fse from 'fs-extra';
import assert from 'node:assert';

import type { Logger } from '../logger';
import type { Report } from '../../types';

export interface JSONRunnerConfig {
  cwd: string;
  dry?: boolean;
  logger?: Logger;
}

export interface JSONSourceFile {
  path: string;
  source: string;
}

export interface JSONTransformAPI {
  cwd: string;
  parse(source: string): any;
  toSource(object: any): string;
}

export type JSONTransform = (file: JSONSourceFile, api: JSONTransformAPI) => string;

// TODO: What's the actual impact of having this line here instead of inside the runner
//       - Does it impact the whole process or just the stuff in this file?
//       - If yes, is it needed to execute everything in a dedicated worker?
require('@babel/register')({
  configFile: false,
  babelrc: false,
  plugins: [],
  extensions: ['.js', '.ts'],
});

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

  assert(typeof transform === 'function');

  for (const path of paths) {
    try {
      const json = require(path);
      // TODO: Optimize the API to limit parse/stringify operations
      const source = JSON.stringify(json);
      const file: JSONSourceFile = { path, source };
      const api: JSONTransformAPI = {
        cwd: config.cwd,
        parse: (source: string) => JSON.parse(source),
        // TODO: We could add prettier formatting to the stringify op (based on prettier config file if it exists)
        toSource: (object: any) => JSON.stringify(object, null, 2),
      };

      const out = await transform(file, api);

      assert(typeof out === 'string');

      // If the json object has modifications
      // TODO: Should we improve the diff strategy to compare objects rather than string versions?
      if (source !== out) {
        if (!dry) {
          fse.writeFileSync(path, out);
        }
        report.ok += 1;
      }
      // No changes
      else {
        report.nochange += 1;
      }
    } catch (e) {
      report.error += 1;
    }
  }

  const endTime = process.hrtime(startTime);
  report.timeElapsed = (endTime[0] + endTime[1] / 1e9).toFixed(3);

  return report;
};
