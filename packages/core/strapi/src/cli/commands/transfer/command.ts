import inquirer from 'inquirer';
import { createCommand, Option } from 'commander';
import path from 'path';
import {
  getCommanderConfirmMessage,
  forceOption,
  parseURL,
  promptEncryptionKey,
} from '../../utils/commander';
import { exitWith, assertUrlHasProtocol, ifOptions } from '../../utils/helpers';
import {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} from '../../utils/data-transfer';

import action from './action';

/**
 * `$ strapi transfer`
 */
const command = () => {
  return (
    createCommand('transfer')
      .description('Transfer data from one source to another')
      .allowExcessArguments(false)
      .addOption(
        new Option(
          '--from <sourceURL>',
          `URL of the remote Strapi instance to get data from`
        ).argParser(parseURL)
      )
      .addOption(new Option('--from-token <token>', `Transfer token for the remote Strapi source`))
      .addOption(
        new Option(
          '--to <destinationURL>',
          `URL of the remote Strapi instance to send data to`
        ).argParser(parseURL)
      )

      .addOption(
        new Option('--to-token <token>', `Transfer token for the remote Strapi destination`)
      )
      .addOption(new Option('--verbose', 'Enable verbose logs'))

      // Shared options
      .addOption(forceOption)
      .addOption(excludeOption)
      .addOption(onlyOption)
      .addOption(throttleOption)
      .hook('preAction', validateExcludeOnly)
      // If --from is used, validate the URL and token
      .hook(
        'preAction',
        ifOptions(
          (opts) => opts.from,
          async (thisCommand) => {
            assertUrlHasProtocol(thisCommand.opts().from, ['https:', 'http:']);
            if (!thisCommand.opts().fromToken) {
              const answers = await inquirer.prompt([
                {
                  type: 'password',
                  message: 'Please enter your transfer token for the remote Strapi source',
                  name: 'fromToken',
                },
              ]);
              if (!answers.fromToken?.length) {
                exitWith(1, 'No token provided for remote source, aborting transfer.');
              }
              thisCommand.opts().fromToken = answers.fromToken;
            }

            await getCommanderConfirmMessage(
              'The transfer will delete all the local Strapi assets and its database. Are you sure you want to proceed?',
              { failMessage: 'Transfer process aborted' }
            )(thisCommand);
          }
        )
      )
      // If --to is used, validate the URL, token, and confirm restore
      .hook(
        'preAction',
        ifOptions(
          (opts) => opts.to,
          async (thisCommand) => {
            assertUrlHasProtocol(thisCommand.opts().to, ['https:', 'http:']);
            if (!thisCommand.opts().toToken) {
              const answers = await inquirer.prompt([
                {
                  type: 'password',
                  message: 'Please enter your transfer token for the remote Strapi destination',
                  name: 'toToken',
                },
              ]);
              if (!answers.toToken?.length) {
                exitWith(1, 'No token provided for remote destination, aborting transfer.');
              }
              thisCommand.opts().toToken = answers.toToken;
            }

            await getCommanderConfirmMessage(
              'The transfer will delete existing data from the remote Strapi! Are you sure you want to proceed?',
              { failMessage: 'Transfer process aborted' }
            )(thisCommand);
          }
        )
      )

      // When experimental is enabled, we allow remote to file or other remote
      .addOption(
        new Option('--experimental', 'Enable experimental features').default(false).hideHelp()
      )

      // File export options
      .addOption(new Option('--to-file <path>', 'Transfer the data to a file').hideHelp())
      .addOption(
        new Option('--to-compress', 'Enable compression for the output file')
          .default(false)
          .hideHelp()
      )
      .addOption(new Option('--to-key <key>', 'Encryption key for the output file').hideHelp())
      .addOption(
        new Option('--to-encrypt', 'Enables encryption for the output file')
          .default(true)
          .hideHelp()
      )
      .addOption(
        new Option('--no-to-encrypt', 'Disables encryption for the output file').hideHelp()
      )

      // Ensure we have a key unless --no-to-encrypt is used
      .hook(
        'preAction',
        ifOptions(
          (opts) => opts.experimental && opts.toFile && opts.toEncrypt,
          promptEncryptionKey('toKey', 'toEncrypt')
        )
      )

      // File import Options
      .addOption(new Option('--from-file <path>', 'Transfer the data from a file').hideHelp())
      .addOption(new Option('--from-key <key>', 'Decryption key for the input file').hideHelp())
      .addOption(
        new Option('--from-decrypt', 'Enables decryption for the input file')
          .default(true)
          .hideHelp()
      )
      .addOption(
        new Option('--no-from-decrypt', 'Disables decryption for the input file').hideHelp()
      )
      .addOption(
        new Option('--from-decompress', 'Enables decompression for the input file')
          .default(true)
          .hideHelp()
      )
      .addOption(
        new Option('--no-from-decompress', 'Disables decompression for the input file').hideHelp()
      )
      // set decrypt and decompress options based on filename
      .hook(
        'preAction',
        ifOptions(
          (opts) => opts.experimental && opts.fromFile,
          async (thisCommand) => {
            const opts = thisCommand.opts();

            const { extname, parse } = path;

            let file = opts.fromFile;

            if (extname(file) === '.enc') {
              file = parse(file).name; // trim the .enc extension
              thisCommand.opts().fromDecrypt = true;
            } else {
              thisCommand.opts().fromDecrypt = false;
            }

            if (extname(file) === '.gz') {
              file = parse(file).name; // trim the .gz extension
              thisCommand.opts().fromDecompress = true;
            } else {
              thisCommand.opts().fromDecompress = false;
            }

            if (extname(file) !== '.tar') {
              exitWith(
                1,
                `The file '${opts.fromFile}' does not appear to be a valid Strapi data file. It must have an extension ending in .tar[.gz][.enc]`
              );
            }
          }
        )
      )

      // Validate the options
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();

        if (!(opts.from || opts.to) || (opts.from && opts.to)) {
          exitWith(
            1,
            'Exactly one remote source (from) or destination (to) option must be provided'
          );
        }

        if (opts.experimental) {
          console.warn('Experimental mode enabled');

          if (opts.from && opts.fromFile) {
            exitWith(1, 'Cannot provide both a remote source and a local file source');
          }

          if (opts.to && opts.toFile) {
            exitWith(1, 'Cannot provide both a remote destination and a local file destination');
          }

          return;
        }

        // File export options
        if (opts.toFile || opts.fromFile) {
          exitWith(
            1,
            'Experimental providers are not available unless --experimental mode is enabled'
          );
        }
      })

      // add the action
      .action(action)
  );
};

export default command;
