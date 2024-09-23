import path from 'node:path';

import * as requirements from './requirements';
import { timerFactory } from '../../modules/timer';
import { upgraderFactory, constants as upgraderConstants } from '../../modules/upgrader';
import { npmPackageFactory } from '../../modules/npm';
import { projectFactory, isApplicationProject } from '../../modules/project';
import * as f from '../../modules/format';
import { Version } from '../../modules/version';

import type { UpgradeOptions } from './types';

export const upgrade = async (options: UpgradeOptions) => {
  const timer = timerFactory();
  const { logger, codemodsTarget } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = path.resolve(options.cwd ?? process.cwd());

  const project = projectFactory(cwd);

  logger.debug(f.projectDetails(project));

  if (!isApplicationProject(project)) {
    throw new Error(
      `The "${options.target}" upgrade can only be run on a Strapi project; for plugins, please use "codemods".`
    );
  }

  const npmPackage = npmPackageFactory(upgraderConstants.STRAPI_PACKAGE_NAME);

  // Load all versions from the registry
  await npmPackage.refresh();

  const upgrader = upgraderFactory(project, options.target, npmPackage)
    .dry(options.dry ?? false)
    .onConfirm(options.confirm ?? null)
    .setLogger(logger);

  // Manually override the target version for codemods if it's explicitly provided
  if (codemodsTarget !== undefined) {
    upgrader.overrideCodemodsTarget(codemodsTarget);
  }

  // We're not adding the same requirements (e.g. "REQUIRE_LATEST_FOR_CURRENT_MAJOR") when manually targeting a
  // major upgrade (using a semver) as it's implied that the user knows what they're doing
  if (options.target === Version.ReleaseType.Major) {
    upgrader
      .addRequirement(requirements.major.REQUIRE_AVAILABLE_NEXT_MAJOR)
      .addRequirement(requirements.major.REQUIRE_LATEST_FOR_CURRENT_MAJOR);
  }

  // Make sure the git repository is in an optional state before running the upgrade
  // Mainly used to ease rollbacks in case the upgrade is corrupted
  upgrader.addRequirement(requirements.common.REQUIRE_GIT.asOptional());

  // Actually run the upgrade process once configured,
  // The response contains information about the final status (success/error)
  const upgradeReport = await upgrader.upgrade();

  if (!upgradeReport.success) {
    throw upgradeReport.error;
  }

  timer.stop();

  logger.info(`Completed in ${f.durationMs(timer.elapsedMs)}`);
};
