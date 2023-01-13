export const SeverityKind = {
  FATAL: 1,
  ERROR: 2,
  SILLY: 3,
} as const;
export type Severity = typeof SeverityKind[keyof typeof SeverityKind];
