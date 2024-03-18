import type { Utils } from '@strapi/types';

import type { Version } from '../version';
import type { Codemod } from '../codemod';
import type { Report } from '../report';

export type FileExtension = `.${string}`;

export interface RunCodemodsOptions {
  dry?: boolean;
  onCodemodStartRunning?(codemod: Codemod.Codemod, index: number): Promise<void> | void;
  onCodemodFinishRunning?(
    codemod: Codemod.Codemod,
    index: number,
    report: Report.Report
  ): Promise<void> | void;
}

export type MinimalPackageJSON = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
} & Utils.JSONObject;

export interface IProjectBase {
  cwd: string;
  files: string[];
  packageJSONPath: string;
  packageJSON: MinimalPackageJSON;

  getFilesByExtensions(extensions: FileExtension[]): string[];
  runCodemods(codemods: Codemod.List, options: RunCodemodsOptions): Promise<Report.CodemodReport[]>;

  refresh(): this;
}

export interface IAppProject extends IProjectBase {
  type: 'app';
  strapiVersion: Version.SemVer;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPluginProject extends IProjectBase {
  type: 'plugin';
}

export type Project = IAppProject | IPluginProject;
