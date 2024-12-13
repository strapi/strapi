import { ErrorDiagnosticSeverity } from '../utils/diagnostic';

export const SeverityKind: Record<string, ErrorDiagnosticSeverity> = {
  FATAL: 'fatal',
  ERROR: 'error',
  SILLY: 'silly',
} as const;
export type Severity = (typeof SeverityKind)[keyof typeof SeverityKind];
