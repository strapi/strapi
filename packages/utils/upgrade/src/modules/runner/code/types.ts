export interface CodeRunnerConfiguration {
  dry?: boolean;
  extensions?: string;
  runInBand?: boolean;
  verbose?: number;
  babel?: boolean;
  print?: boolean;
  silent?: boolean;
  parser?: 'js' | 'ts';
  /**
   * Absolute path to the Strapi application or plugin root. Passed to transforms for
   * path checks that cannot rely on `process.cwd()` (e.g. `--project-path`).
   */
  projectRoot?: string;
}
