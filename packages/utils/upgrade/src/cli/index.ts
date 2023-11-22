import { program, Option, InvalidOptionArgumentError } from 'commander';
import assert from 'node:assert';

import { version } from '../../package.json';
import { isVersion, VersionRelease } from '../core';

import type { CLIOptions } from '../types';

const ALLOWED_TARGETS =
  'Allowed choices are major, minor, patch, latest, or a specific version number in the form "x.x.x"';

program
  .description('Upgrade to the desired version')
  .addOption(
    new Option('-t, --target <target>', `Specify which version to upgrade to. ${ALLOWED_TARGETS}`)
      .default(VersionRelease.Patch)
      .argParser((target) => {
        assert(isVersion(target), new InvalidOptionArgumentError(ALLOWED_TARGETS));
        return target;
      })
  )
  .option('--dry-run', "Simulate the upgrade without updating any files", false)
  .option('-d, --debug', 'Get more logs in debug mode', false)
  .option('-s, --silent', "Don't log anything", false)
  .option('-p, --project-path <project-path>', 'Path to the Strapi project')
  .action(async () => {
    const options = program.opts<CLIOptions>();

    const { upgrade } = await import('./commands/upgrade.js');

    return upgrade(options);
  });

program
  .usage('[options]')
  .helpOption('-h, --help', 'Print command line options')
  .version(version)
  .parse(process.argv);
