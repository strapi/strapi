export interface CodeRunnerConfiguration {
  dry?: boolean;
  extensions?: string;
  runInBand?: boolean;
  verbose?: number;
  babel?: boolean;
  print?: boolean;
  silent?: boolean;
  parser?: 'js' | 'ts';
}
