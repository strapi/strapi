import type { Codemod } from '../codemod';
import type { Report } from '../report';

export interface RunnerConfiguration {
  dry?: boolean;
}

export interface Runner<TConfig extends RunnerConfiguration = RunnerConfiguration> {
  runner: RunnerFunction<TConfig>;
  paths: string[];
  configuration: TConfig;

  valid(codemod: Codemod.Codemod): boolean;

  run(codemod: Codemod.Codemod, configuration?: TConfig): Promise<Report.Report>;
}

export type RunnerFunction<TConfig extends RunnerConfiguration> = (
  codemodPath: string,
  paths: string[],
  configuration: TConfig
) => Promise<Report.Report>;
