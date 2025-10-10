import * as f from '../../modules/format';
import { timerFactory } from '../../modules/timer';
import { projectFactory } from '../../modules/project';
import { codemodRunnerFactory } from '../../modules/codemod-runner';
import { findRangeFromTarget, resolvePath } from './utils';

import type { RunCodemodsOptions } from './types';
import type { CodemodRunnerReport } from '../../modules/codemod-runner';

export const runCodemods = async (options: RunCodemodsOptions) => {
  const timer = timerFactory();
  const { logger, uid } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = resolvePath(options.cwd);

  const project = projectFactory(cwd);
  const range = findRangeFromTarget(project, options.target);

  logger.debug(f.projectDetails(project));
  logger.debug(`Range: set to ${f.versionRange(range)}`);

  const codemodRunner = codemodRunnerFactory(project, range)
    .dry(options.dry ?? false)
    .onSelectCodemods(options.selectCodemods ?? null)
    .setLogger(logger);

  let report: CodemodRunnerReport;

  // If uid is defined, only run the selected codemod
  if (uid !== undefined) {
    logger.debug(`Running a single codemod: ${f.codemodUID(uid)}`);
    report = await codemodRunner.runByUID(uid);
  }

  // By default, only filter using the specified range
  else {
    report = await codemodRunner.run();
  }

  if (!report.success) {
    throw report.error;
  }

  timer.stop();

  logger.info(`Completed in ${timer.elapsedMs}`);
};
