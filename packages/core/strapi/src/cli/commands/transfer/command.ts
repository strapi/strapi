import inquirer from 'inquirer';
import { createCommand, Option } from 'commander';
import { getCommanderConfirmMessage, forceOption, parseURL } from '../../utils/commander';
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
      .addOption(forceOption)
      .addOption(excludeOption)
      .addOption(onlyOption)
      .addOption(throttleOption)
      .hook('preAction', validateExcludeOnly)
      .hook(
        'preAction',
        async (thisCommand) => {
          const opts = thisCommand.opts();
          
          // If neither --from nor --to are provided, prompt for transfer direction
          if (!(opts.from || opts.to)) {
            // Log environment variables status
            const hasUrl = Boolean(process.env.STRAPI_TRANSFER_URL);
            const hasToken = Boolean(process.env.STRAPI_TRANSFER_TOKEN);

            console.info('ℹ️  Data transfer documentation: https://docs.strapi.io/dev-docs/data-management/transfer');

            if (hasUrl || hasToken) {
              console.info('ℹ️  Found transfer configuration in your environment:');
              if (hasUrl) {
                console.info('   → STRAPI_TRANSFER_URL environment variable value will be used as default URL');
              }
              if(hasToken) {
                console.info('   → STRAPI_TRANSFER_TOKEN environment variable value will be used as default token');
              }
            } else {
              console.info('ℹ️  No transfer configuration found in environment variables');
              console.info('   → Add STRAPI_TRANSFER_URL and STRAPI_TRANSFER_TOKEN environment variables to make the transfer process faster for future runs');
            }
            console.log(); // Empty line for better readability

            const { direction } = await inquirer.prompt([
              {
                type: 'list',
                name: 'direction',
                message: 'Choose transfer direction:',
                choices: [
                  { name: 'Pull data from remote Strapi to local', value: 'from' },
                  { name: 'Push local data to remote Strapi', value: 'to' }
                ]
              }
            ]);

            if (direction === 'from') {
              const { remoteUrl, token } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'remoteUrl',
                  message: 'Enter the URL of the remote Strapi instance to get data from:',
                  default: process.env.STRAPI_TRANSFER_URL,
                  validate(input) {
                    try {
                      const url = new URL(input);
                      if (!['http:', 'https:'].includes(url.protocol)) {
                        return 'URL must use http: or https: protocol';
                      }
                      return true;
                    } catch (error) {
                      return 'Please enter a valid URL (e.g., http://localhost:1337/admin or https://example.com/admin)';
                    }
                  }
                },
                {
                  type: 'password',
                  name: 'token',
                  message: 'Enter your transfer token for the remote Strapi source:',
                  default: process.env.STRAPI_TRANSFER_TOKEN,
                  validate(input) {
                    if (!input?.length) {
                      return 'Transfer token is required';
                    }
                    return true;
                  }
                }
              ]);
              opts.from = new URL(remoteUrl);
              opts.fromToken = token;
            } else {
              const { remoteUrl, token } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'remoteUrl',
                  message: 'Enter the URL of the remote Strapi instance to send data to:',
                  default: process.env.STRAPI_TRANSFER_URL,
                  validate(input) {
                    try {
                      const url = new URL(input);
                      if (!['http:', 'https:'].includes(url.protocol)) {
                        return 'URL must use http: or https: protocol';
                      }
                      return true;
                    } catch (error) {
                      return 'Please enter a valid URL (e.g., http://localhost:1337 or https://example.com)';
                    }
                  }
                },
                {
                  type: 'password',
                  name: 'token',
                  message: 'Enter your transfer token for the remote Strapi destination:',
                  default: process.env.STRAPI_TRANSFER_TOKEN,
                  validate(input) {
                    if (!input?.length) {
                      return 'Transfer token is required';
                    }
                    return true;
                  }
                }
              ]);
              opts.to = new URL(remoteUrl);
              opts.toToken = token;
            }
          }
        }
      )
      .hook(
        'preAction',
        ifOptions(
          (opts) => !(opts.from || opts.to) || (opts.from && opts.to),
          async () =>
            exitWith(
              1,
              'Exactly one remote source (from) or destination (to) option must be provided'
            )
        )
      )
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
      .action(action)
  );
};

export default command;
