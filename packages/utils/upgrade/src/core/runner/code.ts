import { run as jscodeshift } from 'jscodeshift/src/Runner';

export interface CodeRunnerConfig {
  dry?: boolean;
  print?: boolean;
  verbose?: number;
  extensions?: string;
  silent?: boolean;
  runInBand?: boolean;
  parser?: 'js' | 'ts';
  babel?: boolean;
  // ...
}

export const transformCode = (
  transformFile: string,
  codeFiles: string[],
  config?: CodeRunnerConfig
) => {
  return jscodeshift(transformFile, codeFiles, config);
};
