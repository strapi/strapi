'use strict';

const { Option } = require('commander');
const path = require('path');
const inquirer = require('inquirer');
const {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} = require('../../utils/data-transfer');
const { getCommanderConfirmMessage, forceOption } = require('../../utils/commander');
const { getLocalScript, exitWith } = require('../../utils/helpers');

/**
 * `$ strapi import`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('import')
    .description('Import data from file to Strapi')
    .allowExcessArguments(false)
    .requiredOption(
      '-f, --file <file>',
      'path and filename for the Strapi export file you want to import'
    )
    .addOption(
      new Option(
        '-k, --key <string>',
        'Provide encryption key in command instead of using the prompt'
      )
    )
    .addOption(forceOption)
    .addOption(excludeOption)
    .addOption(onlyOption)
    .addOption(throttleOption)
    .hook('preAction', validateExcludeOnly)
    .hook('preAction', async (thisCommand) => {
      const opts = thisCommand.opts();
      const ext = path.extname(String(opts.file));

      // check extension to guess if we should prompt for key
      if (ext === '.enc') {
        if (!opts.key) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              message: 'Please enter your decryption key',
              name: 'key',
            },
          ]);
          if (!answers.key?.length) {
            exitWith(1, 'No key entered, aborting import.');
          }
          opts.key = answers.key;
        }
      }
    })
    // set decrypt and decompress options based on filename
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();

      const { extname, parse } = path;

      let file = opts.file;

      if (extname(file) === '.enc') {
        file = parse(file).name; // trim the .enc extension
        thisCommand.opts().decrypt = true;
      } else {
        thisCommand.opts().decrypt = false;
      }

      if (extname(file) === '.gz') {
        file = parse(file).name; // trim the .gz extension
        thisCommand.opts().decompress = true;
      } else {
        thisCommand.opts().decompress = false;
      }

      if (extname(file) !== '.tar') {
        exitWith(
          1,
          `The file '${opts.file}' does not appear to be a valid Strapi data file. It must have an extension ending in .tar[.gz][.enc]`
        );
      }
    })
    .hook(
      'preAction',
      getCommanderConfirmMessage(
        'The import will delete all assets and data in your database. Are you sure you want to proceed?',
        { failMessage: 'Import process aborted' }
      )
    )
    .action(getLocalScript('import'));
};
