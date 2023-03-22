#!/usr/bin/env node

'use strict';

// FIXME
/* eslint-disable import/extensions */
const _ = require('lodash');
const path = require('path');
const resolveCwd = require('resolve-cwd');
const { yellow } = require('chalk');
const { Command, Option } = require('commander');
const inquirer = require('inquirer');

const program = new Command();

const packageJSON = require('../package.json');
const {
  promptEncryptionKey,
  confirmMessage,
  forceOption,
  parseURL,
} = require('../lib/commands/utils/commander');
const { exitWith, ifOptions, assertUrlHasProtocol } = require('../lib/commands/utils/helpers');
const {
  excludeOption,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
} = require('../lib/commands/transfer/utils');

const checkCwdIsStrapiApp = (name) => {
  const logErrorAndExit = () => {
    console.log(
      `You need to run ${yellow(
        `strapi ${name}`
      )} in a Strapi project. Make sure you are in the right directory.`
    );
    process.exit(1);
  };

  try {
    const pkgJSON = require(`${process.cwd()}/package.json`);
    if (!_.has(pkgJSON, 'dependencies.@strapi/strapi')) {
      logErrorAndExit(name);
    }
  } catch (err) {
    logErrorAndExit(name);
  }
};

const getLocalScript =
  (name) =>
  (...args) => {
    checkCwdIsStrapiApp(name);

    const cmdPath = resolveCwd.silent(`@strapi/strapi/lib/commands/${name}`);
    if (!cmdPath) {
      console.log(
        `Error loading the local ${yellow(
          name
        )} command. Strapi might not be installed in your "node_modules". You may need to run "yarn install".`
      );
      process.exit(1);
    }

    const script = require(cmdPath);

    Promise.resolve()
      .then(() => {
        return script(...args);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  };

// Initial program setup
program.storeOptionsAsProperties(false).allowUnknownOption(true);

program.helpOption('-h, --help', 'Display help for command');
program.addHelpCommand('help [command]', 'Display help for command');

// `$ strapi version` (--version synonym)
program.version(packageJSON.version, '-v, --version', 'Output the version number');
program
  .command('version')
  .description('Output the version of Strapi')
  .action(() => {
    process.stdout.write(`${packageJSON.version}\n`);
    process.exit(0);
  });

// `$ strapi console`
program
  .command('console')
  .description('Open the Strapi framework console')
  .action(getLocalScript('console'));

// `$ strapi new`
program
  .command('new <directory>')
  .option('--no-run', 'Do not start the application after it is created')
  .option('--use-npm', 'Force usage of npm instead of yarn to create the project')
  .option('--debug', 'Display database connection errors')
  .option('--quickstart', 'Create quickstart app')
  .option('--dbclient <dbclient>', 'Database client')
  .option('--dbhost <dbhost>', 'Database host')
  .option('--dbport <dbport>', 'Database port')
  .option('--dbname <dbname>', 'Database name')
  .option('--dbusername <dbusername>', 'Database username')
  .option('--dbpassword <dbpassword>', 'Database password')
  .option('--dbssl <dbssl>', 'Database SSL')
  .option('--dbfile <dbfile>', 'Database file path for sqlite')
  .option('--dbforce', 'Allow overwriting existing database content')
  .option('-ts, --typescript', 'Create a typescript project')
  .description('Create a new application')
  .action(require('../lib/commands/new'));

// `$ strapi start`
program
  .command('start')
  .description('Start your Strapi application')
  .action(getLocalScript('start'));

// `$ strapi develop`
program
  .command('develop')
  .alias('dev')
  .option('--no-build', 'Disable build')
  .option('--watch-admin', 'Enable watch', false)
  .option('--polling', 'Watch for file changes in network directories', false)
  .option('--browser <name>', 'Open the browser', true)
  .description('Start your Strapi application in development mode')
  .action(getLocalScript('develop'));

// $ strapi generate
program
  .command('generate')
  .description('Launch the interactive API generator')
  .action(() => {
    checkCwdIsStrapiApp('generate');
    process.argv.splice(2, 1);
    require('@strapi/generators').runCLI();
  });

// `$ strapi generate:template <directory>`
program
  .command('templates:generate <directory>')
  .description('Generate template from Strapi project')
  .action(getLocalScript('generate-template'));

program
  .command('build')
  .option('--no-optimization', 'Build the admin app without optimizing assets')
  .description('Build the strapi admin app')
  .action(getLocalScript('build'));

// `$ strapi install`
program
  .command('install [plugins...]')
  .description('Install a Strapi plugin')
  .action(getLocalScript('install'));

// `$ strapi uninstall`
program
  .command('uninstall [plugins...]')
  .description('Uninstall a Strapi plugin')
  .option('-d, --delete-files', 'Delete files', false)
  .action(getLocalScript('uninstall'));

//   `$ strapi watch-admin`
program
  .command('watch-admin')
  .option('--browser <name>', 'Open the browser', true)
  .description('Start the admin development server')
  .action(getLocalScript('watchAdmin'));

program
  .command('configuration:dump')
  .alias('config:dump')
  .description('Dump configurations of your application')
  .option('-f, --file <file>', 'Output file, default output is stdout')
  .option('-p, --pretty', 'Format the output JSON with indentation and line breaks', false)
  .action(getLocalScript('configurationDump'));

program
  .command('configuration:restore')
  .alias('config:restore')
  .description('Restore configurations of your application')
  .option('-f, --file <file>', 'Input file, default input is stdin')
  .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
  .action(getLocalScript('configurationRestore'));

// Admin
program
  .command('admin:create-user')
  .alias('admin:create')
  .description('Create a new admin')
  .option('-e, --email <email>', 'Email of the new admin')
  .option('-p, --password <password>', 'Password of the new admin')
  .option('-f, --firstname <first name>', 'First name of the new admin')
  .option('-l, --lastname <last name>', 'Last name of the new admin')
  .action(getLocalScript('admin-create'));

program
  .command('admin:reset-user-password')
  .alias('admin:reset-password')
  .description("Reset an admin user's password")
  .option('-e, --email <email>', 'The user email')
  .option('-p, --password <password>', 'New password for the user')
  .action(getLocalScript('admin-reset'));

program
  .command('routes:list')
  .description('List all the application routes')
  .action(getLocalScript('routes/list'));

program
  .command('middlewares:list')
  .description('List all the application middlewares')
  .action(getLocalScript('middlewares/list'));

program
  .command('policies:list')
  .description('List all the application policies')
  .action(getLocalScript('policies/list'));

program
  .command('content-types:list')
  .description('List all the application content-types')
  .action(getLocalScript('content-types/list'));

program
  .command('hooks:list')
  .description('List all the application hooks')
  .action(getLocalScript('hooks/list'));

program
  .command('services:list')
  .description('List all the application services')
  .action(getLocalScript('services/list'));

program
  .command('controllers:list')
  .description('List all the application controllers')
  .action(getLocalScript('controllers/list'));

//    `$ strapi opt-out-telemetry`
program
  .command('telemetry:disable')
  .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
  .action(getLocalScript('opt-out-telemetry'));

//    `$ strapi opt-in-telemetry`
program
  .command('telemetry:enable')
  .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
  .action(getLocalScript('opt-in-telemetry'));

program
  .command('ts:generate-types')
  .description(`Generate TypeScript typings for your schemas`)
  .option(
    '-o, --out-dir <outDir>',
    'Specify a relative directory in which the schemas definitions will be generated'
  )
  .option('-f, --file <file>', 'Specify a filename to store the schemas definitions')
  .option('--verbose', `Display more information about the types generation`, false)
  .option('-s, --silent', `Run the generation silently, without any output`, false)
  .action(getLocalScript('ts/generate-types'));

// `$ strapi transfer`
program
  .command('transfer')
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
  .addOption(new Option('--to-token <token>', `Transfer token for the remote Strapi destination`))
  .addOption(forceOption)
  .addOption(excludeOption)
  .addOption(onlyOption)
  .addOption(throttleOption)
  .hook('preAction', validateExcludeOnly)
  .hook(
    'preAction',
    ifOptions(
      (opts) => !(opts.from || opts.to) || (opts.from && opts.to),
      () =>
        exitWith(1, 'Exactly one remote source (from) or destination (to) option must be provided')
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

        await confirmMessage(
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

        await confirmMessage(
          'The transfer will delete all the remote Strapi assets and its database. Are you sure you want to proceed?',
          { failMessage: 'Transfer process aborted' }
        )(thisCommand);
      }
    )
  )
  .action(getLocalScript('transfer/transfer'));

// `$ strapi export`
program
  .command('export')
  .description('Export data from Strapi to file')
  .allowExcessArguments(false)
  .addOption(
    new Option('--no-encrypt', `Disables 'aes-128-ecb' encryption of the output file`).default(true)
  )
  .addOption(new Option('--no-compress', 'Disables gzip compression of output file').default(true))
  .addOption(
    new Option(
      '-k, --key <string>',
      'Provide encryption key in command instead of using the prompt'
    )
  )
  .addOption(new Option('-f, --file <file>', 'name to use for exported file (without extensions)'))
  .addOption(excludeOption)
  .addOption(onlyOption)
  .addOption(throttleOption)
  .hook('preAction', validateExcludeOnly)
  .hook('preAction', promptEncryptionKey)
  .action(getLocalScript('transfer/export'));

// `$ strapi import`
program
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
    confirmMessage(
      'The import will delete all assets and data in your database. Are you sure you want to proceed?',
      { failMessage: 'Import process aborted' }
    )
  )
  .action(getLocalScript('transfer/import'));

program.parseAsync(process.argv);
