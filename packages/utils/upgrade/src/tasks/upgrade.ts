import ora from 'ora';
import chalk from 'chalk';
import semver from 'semver';
import assert from 'node:assert';
import path from 'node:path';

import {
  createProjectLoader,
  createSemverRange,
  createTimer,
  createTransformsLoader,
  createTransformsRunner,
  createVersionParser,
  isSemVer,
  f,
  VersionRelease,
} from '../core';

import type { RunnerConfiguration } from '../core';
import type { Report, RunReports, TaskOptions } from '../types';
import { isCleanGitRepo } from '../core/requirements/is-clean-git-repo';

export const upgrade = async (options: TaskOptions) => {
  const timer = createTimer();

  const { logger, dryRun = false, exact = false, target = VersionRelease.Minor } = options;

  // Make sure we're resolving the correct working directory based on the given input
  const cwd = path.resolve(options.cwd ?? process.cwd());

  const isTargetValidSemVer = isSemVer(target);
  const isExactModeActivated = exact && isTargetValidSemVer;

  const fTarget = f.version(target);

  if (exact && !isExactModeActivated) {
    logger.warn(`Exact mode is enabled but the target is not a SemVer (${fTarget}), ignoring...`);
  }

  if (isExactModeActivated) {
    logger.debug(`Exact mode is activated for ${fTarget}`);
  }

  logger.debug(`Setting the targeted version to: ${fTarget}`);

  const projectLoader = createProjectLoader({ cwd, logger });
  const project = await projectLoader.load();

  const fCurrentVersion = f.version(project.strapiVersion);

  logger.info(`The current project's Strapi version is ${fCurrentVersion}`);

  // If exact mode is disabled and the given target is older than the current Strapi version, then abort
  if (isTargetValidSemVer && !isExactModeActivated) {
    assert(
      semver.gte(target, project.strapiVersion),
      `When targeting a version lower than the current one (${fTarget} < ${fCurrentVersion}), "exact" mode should be enabled.`
    );
  }

  const transformsRange = isExactModeActivated
    ? createSemverRange(`=${target}`)
    : createSemverRange(`>=${project.strapiVersion}`);
  // check if the repo is clean
  // TODO change force default to false when we add the force option to the CLI
  await isCleanGitRepo({ cwd, logger, force: false, confirm: options.confirm });

  // TODO: In the future, we should allow loading transforms from the user app (custom transforms)
  //       e.g: const userTransformsDir = path.join(cwd, 'transforms');
  const transformsLoader = createTransformsLoader({ logger, range: transformsRange });

  const versionParser = createVersionParser(project.strapiVersion)
    // Indicates the available versions to the parser
    .setAvailable(transformsLoader.availableVersions);

  // Find the next version matching the given target
  const matchedVersion = versionParser.search(target);

  if (matchedVersion) {
    const isTargetingCurrent = matchedVersion === project.strapiVersion;

    const upgradeRange =
      isExactModeActivated || isTargetingCurrent
        ? createSemverRange(`=${matchedVersion}`)
        : createSemverRange(`>${project.strapiVersion} <=${matchedVersion}`);

    const fMatchedVersion = f.version(matchedVersion);
    const fUpgradeRange = f.versionRange(upgradeRange.raw);

    if (isTargetValidSemVer) {
      logger.info(`Targeting ${fMatchedVersion} using ${fUpgradeRange}`);
    } else {
      logger.info(`Targeting ${fMatchedVersion} (${fTarget}) using ${fUpgradeRange}`);
    }

    const transformFiles = transformsLoader.loadRange(upgradeRange);

    const impactedVersions = Array.from(new Set(transformFiles.map((p) => p.version)));
    const fUpgradePlan = [project.strapiVersion]
      .concat(impactedVersions)
      .map((v) => f.version(v))
      .join(' -> ');

    if (isExactModeActivated) {
      logger.debug(`Running the ${fMatchedVersion} upgrade ("exact" mode enabled)`);
      logger.info(`Preparing the ${fMatchedVersion} upgrade...`);
    } else {
      logger.debug(
        `Upgrading from ${fCurrentVersion} to ${fMatchedVersion} with the following plan: ${fUpgradePlan}`
      );
      logger.info(`Preparing the ${fMatchedVersion} upgrade: ${fUpgradePlan}`);
    }

    assert(
      transformFiles.length > 0,
      `A new version seems to exist (${fMatchedVersion}), but no task was found, exiting...`
    );

    if (options.confirm && !dryRun) {
      const shouldProceed = await options.confirm?.(
        `About to apply ${transformFiles.length} transformations on ${project.files.length} files, do you wish to continue?`
      );

      assert(shouldProceed, 'Aborted');
    }

    const runnerConfig: RunnerConfiguration = {
      code: {
        dry: dryRun,
        print: false,
        silent: true,
        extensions: 'js,ts',
        runInBand: true,
        verbose: 0,
        babel: true,
      },
      json: { cwd, dry: dryRun, logger },
    };

    const runner = createTransformsRunner(project.files, { config: runnerConfig, logger });
    const reports: RunReports = [];

    const spinner = ora({
      color: 'green',
      spinner: 'moon',
      isSilent: logger.isSilent,
      prefixText: `(0/${transformFiles.length})`,
    }).start(`Initializing the transforms runner`);

    await runner.runAll(transformFiles, {
      onRunStart(transformFile, runIndex) {
        spinner.prefixText = `(${`${runIndex + 1}/${transformFiles.length}`})`;
        spinner.text = `(${f.version(transformFile.version)}) ${f.path(transformFile.formatted)}`;
      },
      onRunFinish(transformFile, runIndex, report: Report) {
        reports.push({ transform: transformFile, report });
      },
    });

    spinner.stop();

    logger.raw(f.reports(reports));
  } else {
    logger.debug(`The current version (${fCurrentVersion}) is the latest upgrade (${fTarget})`);
    logger.info(chalk.bold('Already up-to-date'));
  }

  if (dryRun) {
    logger.warn('No files were modified (dry run)');
  }

  timer.stop();

  logger.info(`Completed in ${f.durationMs(timer.elapsed)}`);
};
