import type { Codemod } from '../codemod';

import type { CodemodReport, Report } from './types';

export const codemodReportFactory = (codemod: Codemod.Codemod, report: Report): CodemodReport => ({
  codemod,
  report,
});

export const reportFactory = (report: Report): Report => ({ ...report });
