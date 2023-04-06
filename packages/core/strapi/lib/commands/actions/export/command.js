'use strict';

const { Option } = require('commander');
const {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} = require('../../scripts/transfer/utils');
const { promptEncryptionKey } = require('../../scripts/utils/commander');
const { getLocalScript } = require('../../scripts/utils/helpers');

module.exports = (commandContext) => {
  const { command } = commandContext;

  // `$ strapi export`
  command
    .command('export')
    .description('Export data from Strapi to file')
    .allowExcessArguments(false)
    .addOption(
      new Option('--no-encrypt', `Disables 'aes-128-ecb' encryption of the output file`).default(
        true
      )
    )
    .addOption(
      new Option('--no-compress', 'Disables gzip compression of output file').default(true)
    )
    .addOption(
      new Option(
        '-k, --key <string>',
        'Provide encryption key in command instead of using the prompt'
      )
    )
    .addOption(
      new Option('-f, --file <file>', 'name to use for exported file (without extensions)')
    )
    .addOption(excludeOption)
    .addOption(onlyOption)
    .addOption(throttleOption)
    .hook('preAction', validateExcludeOnly)
    .hook('preAction', promptEncryptionKey)
    .action(getLocalScript('export'));
};
