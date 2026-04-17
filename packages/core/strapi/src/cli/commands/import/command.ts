import { statSync } from 'fs';
import path from 'path';
import { createCommand, Option } from 'commander';
import {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} from '../../utils/data-transfer';
import { getCommanderConfirmMessage, forceOption } from '../../utils/commander';
import { exitWith } from '../../utils/helpers';
import { getInquirer } from '../../utils/get-inquirer';
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
        'path to a Strapi export (.tar[.gz][.enc]) or to an unpacked export directory'
      )
      .addOption(
        new Option(
          '-k, --key <string>',
          'Provide encryption key in command instead of using the prompt'
        )
      )
      .addOption(new Option('--verbose', 'Enable verbose logs'))
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
            const inquirer = await getInquirer();
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
      // set decrypt and decompress options based on filename (archive only)
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        const filePath = String(opts.file);

        let isDirectory = false;
        try {
          isDirectory = statSync(filePath).isDirectory();
        } catch {
          // missing path or unreadable — let the transfer fail later with a clear error
        }

        if (isDirectory) {
          thisCommand.opts().decrypt = false;
          thisCommand.opts().decompress = false;
          return;
        }

        const { extname, parse } = path;

        let file = filePath;

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
            `The file '${opts.file}' does not appear to be a valid Strapi data file. Use a path ending in .tar[.gz][.enc], or an existing directory that contains an unpacked export (e.g. metadata.json).`
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
