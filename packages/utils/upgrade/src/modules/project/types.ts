import type { Utils } from '@strapi/types';

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
