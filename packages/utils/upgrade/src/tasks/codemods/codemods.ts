import path from 'node:path';

import { timerFactory } from '../../modules/timer';
import { projectFactory } from '../../modules/project';
import type { RunCodemodsOptions } from './types';
import { codemodRunnerFactory } from '../../modules/codemod-runner';
import { Version, isSemverInstance, rangeFactory } from '../../modules/version';

export const codemods = async (options: RunCodemodsOptions) => {
  const timer = timerFactory();
  const { logger } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = path.resolve(options.cwd ?? process.cwd());

  const project = projectFactory(cwd);
  const range = getRangeFromTarget(project.strapiVersion, options.target);
  const codemodRunner = codemodRunnerFactory(project, range)
    .dry(options.dry ?? false)
    .onSelectCodemods(options.selectCodemods ?? null)
    .setLogger(logger);

  const executionReport = await codemodRunner.run();

  if (!executionReport.success) {
    throw executionReport.error;
  }

  timer.stop();

  logger.info(`Completed in ${timer.elapsedMs}`);
};

const getRangeFromTarget = (
  currentVersion: Version.SemVer,
  target: Version.ReleaseType | Version.LiteralSemVer
) => {
  if (isSemverInstance(target)) {
    return rangeFactory(target);
  }

  const { major, minor, patch } = currentVersion;

  switch (target) {
    case Version.ReleaseType.Major:
      return rangeFactory(`${major}`);
    case Version.ReleaseType.Minor:
      return rangeFactory(`${major}.${minor}`);
    case Version.ReleaseType.Patch:
      return rangeFactory(`${major}.${minor}.${patch}`);
    default:
      throw new Error(`Invalid target set: ${target}`);
  }
};
