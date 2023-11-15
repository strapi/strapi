import CliTable3 from 'cli-table3';
import chalk from 'chalk';

import { ONE_HOUR_MS, ONE_MINUTE_MS, ONE_SECOND_MS } from './time';

import type { SemVer } from '.';
import type { RunReports } from '../types';

export const path = (path: string) => chalk.blue(path);

export const version = (version: SemVer) => chalk.italic(chalk.yellow(version));

export const versionRange = (range: string) => chalk.bold(chalk.green(range));

export const codemod = (codemod: string) => chalk.cyan(codemod);

export const highlight = (text: string) => chalk.bold(chalk.underline(text));

export const reports = (reports: RunReports) => {
  const rows = reports.map(({ codemod, report }, i) => {
    const fIndex = chalk.grey(i);
    const fVersion = chalk.magenta(codemod.version);
    const fFormattedCodemod = chalk.cyan(codemod.formatted);
    const fTimeElapsed =
      i === 0
        ? `${report.timeElapsed}s ${chalk.dim(chalk.italic('(cold start)'))}`
        : `${report.timeElapsed}s`;
    const fAffected = report.ok > 0 ? chalk.green(report.ok) : chalk.grey(0);
    const fUnchanged = report.ok === 0 ? chalk.red(report.nochange) : chalk.grey(report.nochange);
    const fSkipped = report.skip > 0 ? chalk.yellow(report.skip) : chalk.grey(0);

    return [fIndex, fVersion, fFormattedCodemod, fAffected, fUnchanged, fSkipped, fTimeElapsed];
  });

  const table = new CliTable3({
    style: { compact: true },
    head: [
      chalk.grey('N°'),
      chalk.magenta('Version'),
      chalk.cyan('Name'),
      chalk.green('Affected'),
      chalk.red('Unchanged'),
      chalk.yellow('Skipped'),
      chalk.blue('Duration'),
    ].map((header) => chalk.bold(header)),
  });

  table.push(...rows);

  return table.toString();
};

export const duration = (elapsedMs: number) => {
  let restMs = elapsedMs;
  let str = '';

  const concat = (duration: number, suffix: string) => {
    str += `${duration}${suffix}`;
  };

  if (restMs >= ONE_HOUR_MS) {
    concat(Math.floor(restMs / ONE_HOUR_MS), 'h');
    restMs %= ONE_HOUR_MS;
  }

  if (restMs >= ONE_MINUTE_MS) {
    concat(Math.floor(restMs / ONE_MINUTE_MS), 'm');
    restMs %= ONE_MINUTE_MS;
  }

  if (restMs >= ONE_SECOND_MS) {
    concat(Math.floor(restMs / ONE_SECOND_MS), 's');
    restMs %= ONE_SECOND_MS;
  }

  concat(restMs, 'ms');

  return str;
};
