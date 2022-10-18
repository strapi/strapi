'use strict';

const _ = require('lodash');
const resolveCwd = require('resolve-cwd');
const { yellow } = require('chalk');
const { Command } = require('commander');

const packageJSON = require('../../package.json');

const runStrapiCommand = async (argv, command = new Command()) => {
  const exitWithCode = (code) => {
    process.exit(code);
  };

  const checkCwdIsStrapiApp = (name) => {
    const logErrorAndExit = () => {
      console.log(
        `You need to run ${yellow(
          `strapi ${name}`
        )} in a Strapi project. Make sure you are in the right directory.`
      );
      exitWithCode(1);
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
        exitWithCode(1);
      }

      const script = require(cmdPath);

      Promise.resolve()
        .then(() => {
          return script(...args);
        })
        .catch((error) => {
          console.error(error);
          exitWithCode(1);
        });
    };

  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  // `$ strapi version` (--version synonym)
  command.version(packageJSON.version, '-v, --version', 'Output the version number');
  command
    .command('version')
    .description('Output the version of Strapi')
    .action(() => {
      process.stdout.write(`${packageJSON.version}\n`);
      exitWithCode(0);
    });

  // `$ strapi console`
  command
    .command('console')
    .description('Open the Strapi framework console')
    .action(getLocalScript('console'));

  // `$ strapi new`
  command
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
    .action(require('./new'));

  // `$ strapi start`
  command
    .command('start')
    .description('Start your Strapi application')
    .action(getLocalScript('start'));

  // `$ strapi develop`
  command
    .command('develop')
    .alias('dev')
    .option('--no-build', 'Disable build')
    .option('--watch-admin', 'Enable watch', false)
    .option('--polling', 'Watch for file changes in network directories', false)
    .option('--browser <name>', 'Open the browser', true)
    .description('Start your Strapi application in development mode')
    .action(getLocalScript('develop'));

  // $ strapi generate
  command
    .command('generate')
    .description('Launch the interactive API generator')
    .action(() => {
      checkCwdIsStrapiApp('generate');
      argv.splice(2, 1);
      require('@strapi/generators').runCLI();
    });

  // `$ strapi generate:template <directory>`
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('generate-template'));

  command
    .command('build')
    .option('--no-optimization', 'Build the admin app without optimizing assets')
    .description('Build the strapi admin app')
    .action(getLocalScript('build'));

  // `$ strapi install`
  command
    .command('install [plugins...]')
    .description('Install a Strapi plugin')
    .action(getLocalScript('install'));

  // `$ strapi uninstall`
  command
    .command('uninstall [plugins...]')
    .description('Uninstall a Strapi plugin')
    .option('-d, --delete-files', 'Delete files', false)
    .action(getLocalScript('uninstall'));

  //   `$ strapi watch-admin`
  command
    .command('watch-admin')
    .option('--browser <name>', 'Open the browser', true)
    .description('Start the admin development server')
    .action(getLocalScript('watchAdmin'));

  command
    .command('configuration:dump')
    .alias('config:dump')
    .description('Dump configurations of your application')
    .option('-f, --file <file>', 'Output file, default output is stdout')
    .option('-p, --pretty', 'Format the output JSON with indentation and line breaks', false)
    .action(getLocalScript('configurationDump'));

  command
    .command('configuration:restore')
    .alias('config:restore')
    .description('Restore configurations of your application')
    .option('-f, --file <file>', 'Input file, default input is stdin')
    .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
    .action(getLocalScript('configurationRestore'));

  // Admin
  command
    .command('admin:create-user')
    .alias('admin:create')
    .description('Create a new admin')
    .option('-e, --email <email>', 'Email of the new admin')
    .option('-p, --password <password>', 'Password of the new admin')
    .option('-f, --firstname <first name>', 'First name of the new admin')
    .option('-l, --lastname <last name>', 'Last name of the new admin')
    .action(getLocalScript('admin-create'));

  command
    .command('admin:reset-user-password')
    .alias('admin:reset-password')
    .description("Reset an admin user's password")
    .option('-e, --email <email>', 'The user email')
    .option('-p, --password <password>', 'New password for the user')
    .action(getLocalScript('admin-reset'));

  command
    .command('routes:list')
    .description('List all the application routes')
    .action(getLocalScript('routes/list'));

  command
    .command('middlewares:list')
    .description('List all the application middlewares')
    .action(getLocalScript('middlewares/list'));

  command
    .command('policies:list')
    .description('List all the application policies')
    .action(getLocalScript('policies/list'));

  command
    .command('content-types:list')
    .description('List all the application content-types')
    .action(getLocalScript('content-types/list'));

  command
    .command('hooks:list')
    .description('List all the application hooks')
    .action(getLocalScript('hooks/list'));

  command
    .command('services:list')
    .description('List all the application services')
    .action(getLocalScript('services/list'));

  command
    .command('controllers:list')
    .description('List all the application controllers')
    .action(getLocalScript('controllers/list'));

  //    `$ strapi opt-out-telemetry`
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('opt-out-telemetry'));

  //    `$ strapi opt-in-telemetry`
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('opt-in-telemetry'));

  command
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

  return command.parseAsync(argv);
};

module.exports = {
  runStrapiCommand,
};
