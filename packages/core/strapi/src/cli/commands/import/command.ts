import path from 'path';
import { createCommand, Option } from 'commander';
import inquirer from 'inquirer';
import {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} from '../../utils/data-transfer';
import { getCommanderConfirmMessage, forceOption } from '../../utils/commander';
import { exitWith } from '../../utils/helpers';
import action from './action';

/**
 * `$ strapi import`
 */
const command = () => {
  return (
    createCommand('import')
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
          'The import will delete your existing data! Are you sure you want to proceed?',
          { failMessage: 'Import process aborted' }
        )
      )
      .action(action)
  );
};

export default command;
