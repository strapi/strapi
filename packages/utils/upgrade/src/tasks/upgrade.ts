import ora from 'ora';
import chalk from 'chalk';
import semver from 'semver';
import assert from 'node:assert';

import type { RunnerConfiguration, VersionRange } from '../core';
import {
  createProjectLoader,
  createSemverRange,
  createTimer,
  createTransformsLoader,
  createTransformsRunner,
  createVersionParser,
  f,
  isLatestVersion,
  isSemVer,
  isVersionRelease,
  VersionRelease,
} from '../core';
import type { Report, RunReports, TaskOptions } from '../types';

export const upgrade = async (options: TaskOptions) => {
  const { logger, dryRun = false, cwd = process.cwd(), target = VersionRelease.Minor } = options;

  const timer = createTimer();
  const fTarget = f.version(target);

  logger.debug(`Setting the targeted version to: ${fTarget}`);

  const projectLoader = createProjectLoader({ cwd, logger });
  const project = await projectLoader.load();

  const fCurrentVersion = f.version(project.strapiVersion);

  logger.info(`The current project's Strapi version is ${fCurrentVersion}`);

  // If the given target is older than the current Strapi version, then abort
  if (isSemVer(target)) {
    assert(
      semver.compare(project.strapiVersion, target) === -1,
      `The target (${fTarget}) should be greater than the current project version (${fCurrentVersion}).`
    );
  }

  // Create a version range for ">{current}"
  const range: VersionRange = { from: project.strapiVersion, to: VersionRelease.Latest };

  // TODO: In the future, we should allow loading transforms from the user app (custom transforms)
  //       e.g: const userTransformsDir = path.join(cwd, 'transforms');
  const transformsLoader = createTransformsLoader({ logger, range });

  const versionParser = createVersionParser(project.strapiVersion)
    // Indicates the available versions to the parser
    .setAvailable(transformsLoader.availableVersions);

  // Find the next version matching the given target
  const matchedVersion = versionParser.search(target);

  if (matchedVersion) {
    const fMatchedVersion = f.version(matchedVersion);

    // The upgrade range should contain all the upgrades between the current version and the matched one
    const upgradeRange: VersionRange = {
      from: project.strapiVersion,
      to: matchedVersion,
    };

    if (isVersionRelease(target)) {
      isLatestVersion(target)
        ? logger.info(`The ${fTarget} upgrade available is ${fMatchedVersion}`)
        : logger.info(`Latest ${fTarget} upgrade is ${fMatchedVersion}`);
    } else {
      const rawVersionRange = { from: project.strapiVersion, to: target };
      const fRawVersionRange = f.versionRange(createSemverRange(rawVersionRange).raw);
      logger.info(`Latest available upgrade for ${fRawVersionRange} is ${fMatchedVersion}`);
    }

    const transformFiles = transformsLoader.loadRange(upgradeRange);

    const impactedVersions = Array.from(new Set(transformFiles.map((p) => p.version)));
    const fUpgradePlan = [project.strapiVersion]
      .concat(impactedVersions)
      .map((v) => f.version(v))
      .join(' -> ');

    logger.debug(
      `Upgrading from ${fCurrentVersion} to ${fMatchedVersion} with the following plan: ${fUpgradePlan}`
    );
    logger.info(`Preparing the upgrade (${fUpgradePlan})`);

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
    logger.debug(
      `It seems like the current version (${fCurrentVersion}) is the latest major upgrade available`
    );
    logger.info(chalk.bold('Already up-to-date'));
  }

  if (dryRun) {
    logger.warn('No files were modified (dry run)');
  }

  timer.stop();

  logger.info(`Completed in ${f.durationMs(timer.elapsed)}`);
};
