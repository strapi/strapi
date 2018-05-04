const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const eslintErrorsFormatter = require('./eslintErrorsFormatter');

const frontCmd =
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin/build/\' --config ../../node_modules/strapi-lint/lib/internals/eslint/front/.eslintrc.json admin';
const backCmd =
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin\' --config ../../node_modules/strapi-lint/lib/internals/eslint/back/.eslintrc.json controllers config services';

const watcher = (label, pckgName, type = 'front') => {
  shell.echo(label);
  const cmd = type === 'front' ? frontCmd : backCmd;
  shell.cd(`packages/${pckgName}`);
  const data = shell.exec(`${frontCmd} && ${backCmd}`, { silent: true });
  shell.echo(chalk(eslintErrorsFormatter(data.stdout)));
  shell.cd('../..');

  if (data.code !== 0) {
    process.exit(1);
  }

  shell.echo(`Lint tests passed in ${pckgName}`);
};

shell.echo('Testing lint');
watcher('testing admin', 'strapi-admin');
watcher('testing content-manager', 'strapi-plugin-content-manager');
