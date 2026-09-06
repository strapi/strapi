import * as ts from 'typescript';

import { formatHost } from './format-host';

/**
 * Report one or several diagnostic to the console
 */
export const reportDiagnostics = (diagnostics: readonly ts.Diagnostic[] | ts.Diagnostic): void => {
  const formattedDiagnostics = ts.formatDiagnosticsWithColorAndContext(
    Array.isArray(diagnostics) ? diagnostics : [diagnostics],
    formatHost
  );

  console.error(formattedDiagnostics);
  console.info(`Found ${(diagnostics as ts.Diagnostic[]).length} error(s).${ts.sys.newLine}`);
};
