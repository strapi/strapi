import type { Codemod } from '../codemod';

export interface CodemodReport {
  codemod: Codemod.Codemod;
  report: Report;
}

export type Collection = Report[];

export interface Report {
  error: number;
  ok: number;
  nochange: number;
  skip: number;
  timeElapsed: string;
  stats: Record<string, number>;
}
