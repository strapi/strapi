import { AbstractRunner } from '../runner';

import { transformJSON } from './transform';

import type { Codemod } from '../../codemod';
import type { JSONRunnerConfiguration } from './types';

export class JSONRunner extends AbstractRunner<JSONRunnerConfiguration> {
  runner = transformJSON;

  constructor(paths: string[], configuration: JSONRunnerConfiguration) {
    super(paths, configuration);
  }

  valid(codemod: Codemod.Codemod): boolean {
    return codemod.kind === 'json';
  }
}

export const jsonRunnerFactory = (paths: string[], configuration: JSONRunnerConfiguration) => {
  return new JSONRunner(paths, configuration);
};
