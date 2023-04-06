'use strict';

const { Command } = require('commander');

const availableCommands = ['version', 'console', 'new', 'export', 'import'];

const buildStrapiCommand = (argv, command = new Command()) => {
  // Initial program setup
  command.storeOptionsAsProperties(false).allowUnknownOption(true);

  command.helpOption('-h, --help', 'Display help for command');
  command.addHelpCommand('help [command]', 'Display help for command');

  // Load all commands
  availableCommands.forEach((cmdPath) => {
    try {
      require(`./actions/${cmdPath}/command`)({ command, argv });
    } catch (e) {
      console.error(`Failed to load command ${cmdPath}`, e);
    }
  });

  /*


  // `$ strapi generate:template <directory>`
  command
    .command('templates:generate <directory>')
    .description('Generate template from Strapi project')
    .action(getLocalScript('generate-template'));


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

*/

  return command;
};

const runStrapiCommand = async (argv = process.argv, command = new Command()) => {
  await buildStrapiCommand(argv, command).parseAsync(argv);
};

module.exports = {
  runStrapiCommand,
  buildStrapiCommand,
  availableCommands,
  // getLocalScript,
};
