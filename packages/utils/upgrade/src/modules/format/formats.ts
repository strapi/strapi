import CliTable3 from 'cli-table3';
import { styleText } from 'node:util';

import { constants as timerConstants } from '../timer';

import type { AppProject, PluginProject, ProjectType } from '../project';
import type { Codemod } from '../codemod';
import type { Version } from '../version';
import type { Report } from '../report';

export const path = (path: string) => styleText('blue', path);

export const version = (version: Version.LiteralVersion | Version.SemVer) => {
  return styleText(['italic', 'yellow'], `v${version}`);
};

export const codemodUID = (uid: string) => {
  return styleText(['bold', 'cyan'], uid);
};

export const projectDetails = (project: AppProject | PluginProject) => {
  return `Project: TYPE=${projectType(project.type)}; CWD=${path(project.cwd)}; PATHS=${project.paths.map(path)}`;
};

export const projectType = (type: ProjectType) => styleText('cyan', type);

export const versionRange = (range: Version.Range) => styleText(['italic', 'yellow'], range.raw);

export const transform = (transformFilePath: string) => styleText('cyan', transformFilePath);

export const highlight = (arg: unknown) => styleText(['bold', 'underline'], String(arg));

export const upgradeStep = (text: string, step: [current: number, total: number]) => {
  return styleText('bold', `(${step[0]}/${step[1]}) ${text}...`);
};

export const reports = (reports: Report.CodemodReport[]) => {
  const rows = reports.map(({ codemod, report }, i) => {
    const fIndex = styleText('grey', String(i));
    const fVersion = styleText('magenta', String(codemod.version));
    const fKind = styleText('yellow', codemod.kind);
    const fFormattedTransformPath = styleText('cyan', codemod.format());
    const fTimeElapsed =
      i === 0
        ? `${report.timeElapsed}s ${styleText(['dim', 'italic'], '(cold start)')}`
        : `${report.timeElapsed}s`;
    const fAffected =
      report.ok > 0 ? styleText('green', String(report.ok)) : styleText('grey', '0');
    const fUnchanged =
      report.ok === 0
        ? styleText('red', String(report.nochange))
        : styleText('grey', String(report.nochange));

    return [fIndex, fVersion, fKind, fFormattedTransformPath, fAffected, fUnchanged, fTimeElapsed];
  });

  const table = new CliTable3({
    style: { compact: true },
    head: [
      styleText(['bold', 'grey'], 'N°'),
      styleText(['bold', 'magenta'], 'Version'),
      styleText(['bold', 'yellow'], 'Kind'),
      styleText(['bold', 'cyan'], 'Name'),
      styleText(['bold', 'green'], 'Affected'),
      styleText(['bold', 'red'], 'Unchanged'),
      styleText(['bold', 'blue'], 'Duration'),
    ],
  });

  table.push(...rows);

  return table.toString();
};

export const codemodList = (codemods: Codemod.List) => {
  type Row = [index: string, version: string, kind: string, name: string, uid: string];

  const rows = codemods.map<Row>((codemod, index) => {
    const fIndex = styleText('grey', String(index));
    const fVersion = styleText('magenta', String(codemod.version));
    const fKind = styleText('yellow', codemod.kind);
    const fName = styleText('blue', codemod.format());
    const fUID = codemodUID(codemod.uid);

    return [fIndex, fVersion, fKind, fName, fUID] satisfies Row;
  });

  const table = new CliTable3({
    style: { compact: true },
    head: [
      styleText(['bold', 'grey'], 'N°'),
      styleText(['bold', 'magenta'], 'Version'),
      styleText(['bold', 'yellow'], 'Kind'),
      styleText(['bold', 'blue'], 'Name'),
      styleText(['bold', 'cyan'], 'UID'),
    ],
  });

  table.push(...rows);

  return table.toString();
};

export const durationMs = (elapsedMs: number) => {
  const elapsedSeconds = (elapsedMs / timerConstants.ONE_SECOND_MS).toFixed(3);

  return `${elapsedSeconds}s`;
};
