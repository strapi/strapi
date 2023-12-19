import CliTable3 from 'cli-table3';
import chalk from 'chalk';

import { constants as timerConstants } from '../timer';

import type { Version } from '../version';
import type { Report } from '../report';

export const path = (path: string) => chalk.blue(path);

export const version = (version: Version.LiteralVersion | Version.SemVer) => {
  return chalk.italic.yellow(`v${version}`);
};

export const versionRange = (range: Version.Range) => chalk.italic.yellow(range);

export const transform = (transformFilePath: string) => chalk.cyan(transformFilePath);

export const highlight = (arg: unknown) => chalk.bold.underline(arg);

export const upgradeStep = (text: string, step: [current: number, total: number]) => {
  return chalk.bold(`(${step[0]}/${step[1]}) ${text}...`);
};

export const reports = (reports: Report.CodemodReport[]) => {
  const rows = reports.map(({ codemod, report }, i) => {
    const fIndex = chalk.grey(i);
    const fVersion = chalk.magenta(codemod.version);
    const fKind = chalk.yellow(codemod.kind);
    const fFormattedTransformPath = chalk.cyan(codemod.format());
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

export const durationMs = (elapsedMs: number) => {
  const elapsedSeconds = (elapsedMs / timerConstants.ONE_SECOND_MS).toFixed(3);

  return `${elapsedSeconds}s`;
};
