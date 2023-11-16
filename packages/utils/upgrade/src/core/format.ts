import CliTable3 from 'cli-table3';
import chalk from 'chalk';

import { ONE_HOUR_MS, ONE_MINUTE_MS, ONE_SECOND_MS } from './time';

import type { SemVer } from '.';
import type { RunReports } from '../types';

export const path = (path: string) => chalk.blue(path);

export const version = (version: SemVer) => chalk.italic.yellow(version);

export const versionRange = (range: string) => chalk.bold.green(range);

export const transform = (transformFilePath: string) => chalk.cyan(transformFilePath);

export const highlight = (text: string) => chalk.bold.underline(text);

export const reports = (reports: RunReports) => {
  const rows = reports.map(({ transform, report }, i) => {
    const fIndex = chalk.grey(i);
    const fVersion = chalk.magenta(transform.version);
    const fKind = chalk.yellow(transform.kind);
    const fFormattedTransformPath = chalk.cyan(transform.formatted);
    const fTimeElapsed =
      i === 0
        ? `${report.timeElapsed}s ${chalk.dim.italic('(cold start)')}`
        : `${report.timeElapsed}s`;
    const fAffected = report.ok > 0 ? chalk.green(report.ok) : chalk.grey(0);
    const fUnchanged = report.ok === 0 ? chalk.red(report.nochange) : chalk.grey(report.nochange);

    return [fIndex, fVersion, fKind, fFormattedTransformPath, fAffected, fUnchanged, fTimeElapsed];
  });

  const table = new CliTable3({
    style: { compact: true },
    head: [
      chalk.bold.grey('N°'),
      chalk.bold.magenta('Version'),
      chalk.bold.yellow('Kind'),
      chalk.bold.cyan('Name'),
      chalk.bold.green('Affected'),
      chalk.bold.red('Unchanged'),
      chalk.bold.blue('Duration'),
    ],
  });

  table.push(...rows);

  return table.toString();
};

export const duration = (elapsedMs: number) => {
  const elapsedSeconds = (elapsedMs / ONE_SECOND_MS).toFixed(3);

  return `${elapsedSeconds}s`;
};
