import { run as jscodeshift } from 'jscodeshift/src/Runner';

import { AbstractRunner } from '../runner';

import type { Codemod } from '../../codemod';
import type { CodeRunnerConfiguration } from './types';

export class CodeRunner extends AbstractRunner<CodeRunnerConfiguration> {
  runner = jscodeshift;

  constructor(paths: string[], configuration: CodeRunnerConfiguration) {
    super(paths, configuration);
  }

  valid(codemod: Codemod.Codemod): boolean {
    return codemod.kind === 'code';
  }
}

export const codeRunnerFactory = (paths: string[], configuration: CodeRunnerConfiguration) => {
  return new CodeRunner(paths, configuration);
};
