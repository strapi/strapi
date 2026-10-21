import * as ts from 'typescript';
import { merge } from 'lodash';

import { reportDiagnostics } from '../utils/report-diagnostics';
import { resolveConfigOptions } from '../utils/resolve-config-options';

export interface ConfigOptions {
  fileNames?: string[];
  options?: ts.CompilerOptions;
  ignoreDiagnostics?: boolean;
}

/**
 * Default TS -> JS Compilation for Strapi
 */
export function run(tsConfigPath: string, configOptions: ConfigOptions = {}) {
  const { ignoreDiagnostics = false } = configOptions;
  // Parse the tsconfig.json file & resolve the configuration options
  const { fileNames, options, projectReferences } = resolveConfigOptions(tsConfigPath);

  const compilerOptions = merge(options, configOptions.options);

  if (ignoreDiagnostics) {
    Object.assign(compilerOptions, { noEmit: false, noEmitOnError: false });
  }

  const program = ts.createProgram({
    rootNames: configOptions.fileNames ? configOptions.fileNames : fileNames,
    projectReferences,
    options: compilerOptions,
  });

  const emitResults = program.emit();

  const diagnostics = ts.sortAndDeduplicateDiagnostics(
    ts.getPreEmitDiagnostics(program).concat(emitResults.diagnostics)
  );

  if (!ignoreDiagnostics && diagnostics.length > 0) {
    reportDiagnostics(diagnostics);
  }

  // If the compilation failed and diagnostics are not ignored, exit early
  if (!ignoreDiagnostics && emitResults.emitSkipped) {
    throw new Error('TypeScript compilation failed');
  }
}
