import path from 'node:path';

import * as requirements from './requirements';
import { timerFactory } from '../../modules/timer';
import { upgraderFactory, constants as upgraderConstants } from '../../modules/upgrader';
import { npmPackageFactory } from '../../modules/npm';
import { projectFactory } from '../../modules/project';
import { Version } from '../../modules/version';

import type { UpgradeOptions } from './types';

export const upgrade = async (options: UpgradeOptions) => {
  const timer = timerFactory();
  const { logger } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = path.resolve(options.cwd ?? process.cwd());

  const project = projectFactory(cwd);
  const npmPackage = npmPackageFactory(upgraderConstants.STRAPI_PACKAGE_NAME);
  // Load all versions from the registry
  await npmPackage.refresh();

  const upgrader = upgraderFactory(project, options.target, npmPackage)
    .dry(options.dry ?? false)
    .onConfirm(options.confirm ?? null)
    .setLogger(logger)
    .setRunSelectedCodemodsOnly(options.codemodsOnly ?? false);

  if (options.target === Version.ReleaseType.Major) {
    upgrader
      .addRequirement(requirements.major.REQUIRE_AVAILABLE_NEXT_MAJOR)
      .addRequirement(requirements.major.REQUIRE_LATEST_FOR_CURRENT_MAJOR);
  }

  upgrader.addRequirement(requirements.common.REQUIRE_GIT.asOptional());

  const upgradeReport = await upgrader.upgrade();

  if (!upgradeReport.success) {
    throw upgradeReport.error;
  }

  timer.stop();

  logger.info(`Completed in ${timer.elapsedMs}`);
};
