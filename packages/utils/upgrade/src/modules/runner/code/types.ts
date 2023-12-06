export interface CodeRunnerConfiguration {
  dry?: boolean;
  extensions?: string;
  runInBand?: boolean;
  verbose?: number; // static 0
  babel?: boolean; // static true
  print?: boolean; // static false
  silent?: boolean; // static true
  parser?: 'js' | 'ts'; // static ts
}
