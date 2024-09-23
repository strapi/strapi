import type { Codemod } from '../codemod';

import type { Runner as RunnerInterface, RunnerConfiguration, RunnerFunction } from './types';

export abstract class AbstractRunner<TConfig extends RunnerConfiguration>
  implements RunnerInterface<TConfig>
{
  abstract runner: RunnerFunction<TConfig>;

  paths: string[];

  configuration: TConfig;

  constructor(paths: string[], configuration: TConfig) {
    this.paths = paths;
    this.configuration = configuration;
  }

  async run(codemod: Codemod.Codemod, configuration?: TConfig) {
    const isValidCodemod = this.valid(codemod);

    if (!isValidCodemod) {
      throw new Error(`Invalid codemod provided to the runner: ${codemod.filename}`);
    }

    const runConfiguration: TConfig = { ...this.configuration, ...configuration };

    return this.runner(codemod.path, this.paths, runConfiguration);
  }

  abstract valid(codemod: Codemod.Codemod): boolean;
}
