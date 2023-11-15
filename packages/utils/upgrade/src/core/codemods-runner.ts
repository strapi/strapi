import { run as jscodeshift } from 'jscodeshift/src/Runner';

import type { Logger } from './logger';
import type { CodemodPath, Report } from '../types';

export interface CodemodsRunner {
  run(transform: CodemodPath, config?: CodeShiftConfig): Promise<Report>;
  runAll(transforms: CodemodPath[], config?: RunAllOptions): Promise<Report[]>;
}

export interface CodeShiftConfig {
  dry?: boolean;
  print?: boolean;
  verbose?: number;
  extensions?: string;
  silent?: boolean;
  runInBand?: boolean;
  parser?: 'js' | 'ts';
  babel?: boolean;
  // ...
}

export interface RunnerOptions {
  config?: CodeShiftConfig;
  logger: Logger;
}

export interface RunAllOptions {
  config?: CodeShiftConfig;
  onRunStart?(codemod: CodemodPath, runIndex: number): Promise<void> | void;
  onRunFinish?(codemod: CodemodPath, runIndex: number, report: Report): Promise<void> | void;
}

export const createCodemodsRunner = (paths: string[], options: RunnerOptions): CodemodsRunner => {
  const run = async (codemod: CodemodPath, config?: CodeShiftConfig): Promise<Report> => {
    return jscodeshift(codemod.fullPath, paths, {
      ...options.config,
      ...config,
    });
  };

  const runAll = async (codemods: CodemodPath[], options: RunAllOptions) => {
    const reports: Report[] = [];

    let runIndex = 0;
    for (const codemod of codemods) {
      await options.onRunStart?.(codemod, runIndex);

      const report = await run(codemod, options.config);
      reports.push(report);

      await options.onRunFinish?.(codemod, runIndex, report);

      runIndex += 1;
    }

    return reports;
  };

  return { run, runAll };
};
