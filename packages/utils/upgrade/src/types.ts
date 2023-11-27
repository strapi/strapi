import type { Logger, SemVer, Version } from './core';

export interface CLIOptions {
  target?: Version;
  projectPath?: string;
  dryRun: boolean;
  silent: boolean;
  debug: boolean;
  exact: boolean;
}

export interface TaskOptions {
  confirm?: (message: string) => Promise<boolean> | Promise<undefined> | boolean | undefined;
  cwd?: string;
  dryRun?: boolean;
  exact?: boolean;
  target?: Version;
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
