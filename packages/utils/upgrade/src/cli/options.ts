import { InvalidArgumentError, Option } from 'commander';
import { isValidStringifiedRange, rangeFactory } from '../modules/version';

export const projectPathOption = new Option(
  '-p, --project-path <project-path>',
  'Root path to the Strapi application or plugin'
);

export const dryOption = new Option(
  '-n, --dry',
  'Simulate the upgrade without updating any files'
).default(false);

export const debugOption = new Option('-d, --debug', 'Get more logs in debug mode').default(false);

export const silentOption = new Option('-s, --silent', "Don't log anything").default(false);

export const autoConfirmOption = new Option(
  '-y, --yes',
  'Automatically answer "yes" to any prompts that the CLI might print on the command line.'
).default(false);

export const rangeOption = new Option(
  '-r, --range <range>',
  'Use a custom semver range for the codemods execution.'
).argParser((range) => {
  if (!isValidStringifiedRange(range)) {
    throw new InvalidArgumentError('Expected a valid semver range');
  }

  return rangeFactory(range);
});
