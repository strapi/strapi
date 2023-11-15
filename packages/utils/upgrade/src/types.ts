import type { Logger, SemVer } from './core';

export interface CLIOptions {
  // TODO: Add back the version option when we handle targeting specific versions
  // NOTE: For now we can only accept major upgrades & allow minors and patches in future releases
  // version?: Version.Latest | Version.Major;
  dryRun: boolean;
  silent: boolean;
  debug: boolean;
}

export interface TaskOptions {
  confirm?: (message: string) => Promise<boolean> | Promise<undefined> | boolean | undefined;
  dryRun?: boolean;
  logger: Logger;
}

export interface CodemodPath {
  path: string;
  formatted: string;
  fullPath: string;
  version: SemVer;
}

export interface RunReport {
  codemod: CodemodPath;
  report: Report;
}

export type RunReports = RunReport[];

export interface Report {
  stats: Record<string, number>;
  timeElapsed: string;
  error: number;
  ok: number;
  nochange: number;
  skip: number;
}
