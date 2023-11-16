import type { Logger, SemVer } from './core';

export interface CLIOptions {
  // TODO: Add back the version option when we handle targeting specific versions
  // NOTE: For now we can only accept major upgrades & allow minors and patches in future releases
  // version?: Version.Latest | Version.Major;
  projectPath?: string;
  dryRun: boolean;
  silent: boolean;
  debug: boolean;
}

export interface TaskOptions {
  confirm?: (message: string) => Promise<boolean> | Promise<undefined> | boolean | undefined;
  cwd?: string;
  dryRun?: boolean;
  logger: Logger;
}

export type TransformFileKind = 'code' | 'json';

export interface TransformFile {
  kind: TransformFileKind;
  path: string;
  formatted: string;
  fullPath: string;
  version: SemVer;
}

export interface RunReport {
  transform: TransformFile;
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
