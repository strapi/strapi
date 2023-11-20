import ora from 'ora';
import chalk from 'chalk';
import assert from 'node:assert';

import {
  f,
  createProjectLoader,
  createTransformsRunner,
  createVersionParser,
  createTransformsLoader,
  createTimer,
  RunnerConfiguration,
} from '../core';

import type { VersionRange } from '../core';
import type { Report, RunReports, TaskOptions } from '../types';

export const next = async (options: TaskOptions) => {
  const { logger, dryRun = false, cwd = process.cwd() } = options;

  const timer = createTimer();

  const projectLoader = createProjectLoader({ cwd, logger });
  const project = await projectLoader.load();

  const fCurrentVersion = f.version(project.strapiVersion);

  logger.info(`The current project's Strapi version is ${fCurrentVersion}`);

  // Create a version range for ">{current}"
  const range: VersionRange = { from: project.strapiVersion, to: 'latest' };

  // TODO: In the future, we should allow loading transforms from the user app (custom transforms)
  //       e.g: const userTransformsDir = path.join(cwd, 'transforms');
  const transformsLoader = createTransformsLoader({ logger, range });

  const versionParser = createVersionParser(project.strapiVersion)
    // Indicates the available versions to the parser
    .setAvailable(transformsLoader.availableVersions);

  // Find the next available major version for the current project
  const nextMajorVersion = versionParser.nextMajor();

  if (nextMajorVersion) {
    logger.info(`The next major version is ${f.version(nextMajorVersion)}`);

    // The upgrade range should contain all the upgrades between the current version and the next major
    const upgradeRange: VersionRange = {
      from: project.strapiVersion,
      to: nextMajorVersion,
    };
    const transformFiles = transformsLoader.loadRange(upgradeRange);

    const impactedVersions = Array.from(new Set(transformFiles.map((p) => p.version)));
    const fUpgradePlan = [project.strapiVersion]
      .concat(impactedVersions)
      .map((v) => f.version(v))
      .join(' -> ');

    const fTarget = f.version(nextMajorVersion);

    logger.debug(
      `Upgrading from ${fCurrentVersion} to ${fTarget} with the following plan: ${fUpgradePlan}`
    );
    logger.info(`Preparing the upgrade (${fUpgradePlan})`);

    assert(
      transformFiles.length > 0,
      `A new version seems to exist (${fTarget}), but no task was found, exiting...`
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

  logger.info(`Completed in ${f.duration(timer.elapsed)}`);
};
