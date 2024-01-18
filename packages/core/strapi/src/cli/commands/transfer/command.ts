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
      .addOption(forceOption)
      .addOption(excludeOption)
      .addOption(onlyOption)
      .addOption(throttleOption)
      .hook('preAction', validateExcludeOnly)
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
