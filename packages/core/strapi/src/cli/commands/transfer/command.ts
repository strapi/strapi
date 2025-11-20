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
        ifOptions(
          async (opts) =>
            (opts.from && opts.to) || (opts.from && opts.toToken) || (opts.to && opts.fromToken),
          async () =>
            exitWith(1, 'Only one remote source (from) or destination (to) option may be provided')
        )
      )
      .hook(
        'preAction',
        ifOptions(
          // Only run interactive prompts if neither --from nor --to is provided
          async (opts) => !opts.from && !opts.to,
          async (thisCommand) => {
            const opts = thisCommand.opts();
            const hasEnvUrl = process.env.STRAPI_TRANSFER_URL;
            const hasEnvToken = process.env.STRAPI_TRANSFER_TOKEN;

            const logDocumentation = () => {
              console.info(
                'ℹ️  Data transfer documentation: https://docs.strapi.io/dev-docs/data-management/transfer'
              );
            };

            const logEnvironmentVariables = () => {
              if (!hasEnvUrl && !hasEnvToken) {
                console.info('ℹ️  No transfer configuration found in environment variables');
                console.info(
                  '   → Add STRAPI_TRANSFER_URL and STRAPI_TRANSFER_TOKEN environment variables to make the transfer process faster for future runs'
                );
                return;
              }

              console.info('ℹ️  Found transfer configuration in your environment:');

              if (hasEnvUrl) {
                console.info(
                  `   → Environment STRAPI_TRANSFER_URL (${hasEnvUrl}) will be used as the transfer URL`
                );
              }

              if (hasEnvToken) {
                console.info(
                  '   → Environment STRAPI_TRANSFER_TOKEN value will be used as the transfer token'
                );
              }

              console.info(); // Empty line for better readability
            };

            const determineDirection = async () => {
              // If user has not provided a direction from CLI, log the documentation
              if (!opts.from && !opts.to) {
                logDocumentation();
              }

              logEnvironmentVariables();

              if (opts.from) {
                return 'from';
              }
              if (opts.to) {
                return 'to';
              }

              const { dir } = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'dir',
                  message: 'Choose transfer direction:',
                  choices: [
                    { name: 'Pull data from remote Strapi to local', value: 'from' },
                    { name: 'Push local data to remote Strapi', value: 'to' },
                  ],
                },
              ]);

              return dir;
            };

            const determineUrl = async (direction: 'from' | 'to') => {
              if (opts[direction]) {
                return new URL(opts[direction]);
              }

              if (process.env.STRAPI_TRANSFER_URL) {
                return new URL(process.env.STRAPI_TRANSFER_URL);
              }

              const answer = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'remoteUrl',
                  message: `Enter the URL of the remote Strapi instance to ${direction === 'from' ? 'get data from' : 'send data to'}:`,
                  default: process.env.STRAPI_TRANSFER_URL,
                  validate(input: string) {
                    try {
                      const url = new URL(input);
                      if (!['http:', 'https:'].includes(url.protocol)) {
                        return 'URL must use http: or https: protocol';
                      }
                      return true;
                    } catch (error) {
                      return 'Please enter a valid URL (e.g., http://localhost:1337/admin or https://example.com/admin)';
                    }
                  },
                },
              ]);

              return new URL(answer.remoteUrl);
            };

            const determineToken = async (direction: 'from' | 'to') => {
              if (opts[`${direction}Token`]) {
                return opts[`${direction}Token`];
              }

              if (process.env.STRAPI_TRANSFER_TOKEN) {
                return process.env.STRAPI_TRANSFER_TOKEN;
              }

              const answer = await inquirer.prompt([
                {
                  type: 'password',
                  name: 'token',
                  message: `Enter the transfer token for the remote Strapi ${direction === 'from' ? 'source' : 'destination'}:`,
                  default: process.env.STRAPI_TRANSFER_TOKEN,
                  validate(input: string) {
                    if (!input?.length) {
                      return 'Transfer token is required';
                    }
                    return true;
                  },
                },
              ]);

              return answer.token;
            };

            const direction = await determineDirection();
            opts[direction] = await determineUrl(direction);
            opts[`${direction}Token`] = await determineToken(direction);
          }
        )
      )
      // If --from is used, validate the URL and token
      .hook(
        'preAction',
        ifOptions(
          async (opts) => opts.from,
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
          async (opts) => opts.to,
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
