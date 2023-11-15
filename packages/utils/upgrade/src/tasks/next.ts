import ora from 'ora';
import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import assert from 'node:assert';

import {
  f,
  createProjectLoader,
  createCodemodsRunner,
  createVersionParser,
  createCodemodsLoader,
  CodeShiftConfig,
  createTimer,
} from '../core';

import type { Report, RunReports, TaskOptions, VersionRange } from '../types';

export const next = async (options: TaskOptions) => {
  const { logger, dryRun = false } = options;

  const timer = createTimer();
  const cwd = process.cwd();

  const projectLoader = createProjectLoader({ cwd, logger });
  const project = await projectLoader.load();

  const fCurrentVersion = f.version(project.strapiVersion);

  logger.info(`The current project's Strapi version is ${fCurrentVersion}`);

  // Create a version range for ">{current}"
  const range: VersionRange = { from: project.strapiVersion, to: 'latest' };

  // TODO: In the future, we should allow to load codemods from the user app (custom codemods)
  //       e.g: const userCodemodsDir = path.join(cwd, 'codemods');
  const codemodsLoader = createCodemodsLoader({ logger, range });

  const versionParser = createVersionParser(project.strapiVersion)
    // Indicates the available versions to the parser
    .setAvailable(codemodsLoader.availableVersions);

  // Find the next available major version for the current project
  const nextMajorVersion = versionParser.nextMajor();

  if (nextMajorVersion) {
    logger.info(`The next major version is ${f.version(nextMajorVersion)}`);

    // The upgrade range should contain all the upgrades between the current version and the next major
    const upgradeRange: VersionRange = { from: project.strapiVersion, to: nextMajorVersion };
    const codemods = codemodsLoader.loadRange(upgradeRange);

    const impactedVersions = Array.from(new Set(codemods.map((p) => p.version)));
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
      codemods.length > 0,
      `A new version seems to exist (${fTarget}), but no transform script was found, exiting...`
    );

    if (options.confirm && !dryRun) {
      const shouldProceed = await options.confirm?.(
        `About to apply ${codemods.length} transformations on ${project.files.length} files, do you wish to continue?`
      );

      assert(shouldProceed, 'Aborted');
    }

    const runnerConfig: CodeShiftConfig = {
      dry: dryRun,
      print: false,
      silent: true,
      extensions: 'js,ts',
      runInBand: true,
      verbose: 0,
      babel: true,
    };

    const runner = createCodemodsRunner(project.files, { logger, config: runnerConfig });

    const reports: RunReports = [];

    const spinner = ora({
      color: 'green',
      spinner: 'moon',
      isSilent: logger.isSilent,
    }).start(`(0/${codemods.length}) Initializing the codemod runner`);

    await runner.runAll(codemods, {
      onRunStart(codemod, runIndex) {
        spinner.prefixText = `(${`${runIndex + 1}/${codemods.length}`})`;
        spinner.text = `(${f.version(codemod.version)}) ${f.path(codemod.formatted)}`;
      },
      onRunFinish(codemod, runIndex, report: Report) {
        reports.push({ codemod, report });
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
