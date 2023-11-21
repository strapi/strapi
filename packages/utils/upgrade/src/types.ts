import type { Logger, SemVer, Version } from './core';

export interface CLIOptions {
  // TODO: Add back the version option when we handle targeting specific versions
  // NOTE: For now we can only accept major upgrades & allow minors and patches in future releases
  target?: Version;
  projectPath?: string;
  dryRun: boolean;
  silent: boolean;
  debug: boolean;
}

export interface TaskOptions {
  confirm?: (message: string) => Promise<boolean> | Promise<undefined> | boolean | undefined;
  cwd?: string;
  dryRun?: boolean;
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

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export type JSONArray = Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}
