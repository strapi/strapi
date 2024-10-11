import path from 'node:path';

import * as f from '../../modules/format';
import { npmPackageFactory } from '../../modules/npm';
import { isApplicationProject, projectFactory } from '../../modules/project';
import { timerFactory } from '../../modules/timer';
import { constants as upgraderConstants, upgraderFactory } from '../../modules/upgrader';
import { Version } from '../../modules/version';

import * as requirements from './requirements';

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

  logger.debug(
    `Application: VERSION=${f.version(project.packageJSON.version as Version.LiteralVersion)}; STRAPI_VERSION=${f.version(project.strapiVersion)}`
  );

  const npmPackage = npmPackageFactory(upgraderConstants.STRAPI_PACKAGE_NAME);

  // Load all available versions from the NPM registry
  await npmPackage.refresh();

  // Initialize the upgrade instance
  // Throws during initialization if the provided target is incompatible with the current version
  const upgrader = upgraderFactory(project, options.target, npmPackage)
    .dry(options.dry ?? false)
    .onConfirm(options.confirm ?? null)
    .setLogger(logger);

  // Manually override the target version for codemods if it's explicitly provided
  if (codemodsTarget !== undefined) {
    upgrader.overrideCodemodsTarget(codemodsTarget);
  }

  // Don't add the same requirements when manually targeting a major upgrade
  // using a semver as it's implied that the users know what they're doing
  if (options.target === Version.ReleaseType.Major) {
    upgrader
      .addRequirement(requirements.major.REQUIRE_AVAILABLE_NEXT_MAJOR)
      .addRequirement(requirements.major.REQUIRE_LATEST_FOR_CURRENT_MAJOR);
  }

  // Make sure the git repository is in an optimal state before running the upgrade
  // Mainly used to ease rollbacks in case the upgrade is corrupted
  upgrader.addRequirement(requirements.common.REQUIRE_GIT.asOptional());

  // Actually run the upgrade process once configured,
  // The response contains information about the final status: success/error
  const upgradeReport = await upgrader.upgrade();

  if (!upgradeReport.success) {
    throw upgradeReport.error;
  }

  timer.stop();

  logger.info(`Completed in ${f.durationMs(timer.elapsedMs)}ms`);
};
