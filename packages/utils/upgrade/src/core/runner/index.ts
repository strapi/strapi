import { extname } from 'node:path';

import { transformCode } from './code';
import { transformJSON } from './json';

import type { CodeRunnerConfig } from './code';
import type { JSONRunnerConfig } from './json';
import type { Logger } from '../logger';
import type { TransformFile, Report } from '../../types';

export * from './json';
export * from './code';

export interface TransformsRunner {
  run(transform: TransformFile, config?: RunnerConfiguration): Promise<Report>;
  runAll(transforms: TransformFile[], config?: RunAllOptions): Promise<Report[]>;
}

export interface RunAllOptions {
  config?: RunnerConfiguration;
  onRunStart?(transformFile: TransformFile, runIndex: number): Promise<void> | void;
  onRunFinish?(
    transformFile: TransformFile,
    runIndex: number,
    report: Report
  ): Promise<void> | void;
}

export interface RunnerOptions {
  config: RunnerConfiguration;
  logger: Logger;
}

export interface RunnerConfiguration {
  code: CodeRunnerConfig;
  json: JSONRunnerConfig;
}

const FILES_JSON_EXT = ['.json'];
const FILES_CODE_EXT = ['.js', '.ts'];

export const createTransformsRunner = (
  paths: string[],
  options: RunnerOptions
): TransformsRunner => {
  const codeFiles = filterPathsByExtensions(paths, FILES_CODE_EXT);
  const jsonFiles = filterPathsByExtensions(paths, FILES_JSON_EXT);

  const run = (transformFile: TransformFile, config?: RunnerConfiguration): Promise<Report> => {
    if (transformFile.kind === 'code') {
      return transformCode(transformFile.fullPath, codeFiles, {
        ...options.config?.code,
        ...config?.code,
      });
    }

    if (transformFile.kind === 'json') {
      return transformJSON(transformFile.fullPath, jsonFiles, {
        ...options.config?.json,
        ...config?.json,
      });
    }

    throw new Error('Invalid transform file submitted, exiting...');
  };

  const runAll = async (transformFiles: TransformFile[], options: RunAllOptions) => {
    const reports: Report[] = [];

    let runIndex = 0;
    for (const transformFile of transformFiles) {
      await options.onRunStart?.(transformFile, runIndex);

      const report = await run(transformFile, options.config);
      reports.push(report);

      await options.onRunFinish?.(transformFile, runIndex, report);

      runIndex += 1;
    }

    return reports;
  };

  return { run, runAll };
};

const filterPathsByExtensions = (paths: string[], extensions: string[]) => {
  return paths.filter((path) => extensions.includes(extname(path)));
};
