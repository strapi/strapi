const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const eslintErrorsFormatter = require('./eslintErrorsFormatter');
const glob = require('glob');
const fs = require('fs');
const listChangedFiles = require('../packages/strapi-lint/lib/internals/shared/listChangedFiles.js');
const changedFiles = listChangedFiles();
const { includes, take } = require('lodash');

const frontCmd =
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin/build/\' --config ../../node_modules/strapi-lint/lib/internals/eslint/front/.eslintrc.json admin';
const helperCmd =
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin/build/\' --config ../../node_modules/strapi-lint/lib/internals/eslint/front/.eslintrc.json lib/src';
const backCmd =
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern \'/admin\' --config ../../node_modules/strapi-lint/lib/internals/eslint/back/.eslintrc.json controllers config services bin lib';


const watcher = (label, pckgName, type = 'front') => {
  shell.echo(label);
  shell.cd(pckgName);
  const cmd = includes(pckgName, 'strapi-helper-plugin') ? helperCmd : `${frontCmd} && ${backCmd}`;
  
  const data = shell.exec(cmd, { silent: true });
  shell.echo(chalk(eslintErrorsFormatter(data.stdout)));
  shell.cd('../..');

  if (data.code !== 0) {
    process.exit(1);
  }
  shell.echo('');
};

const files = glob
  .sync('**/*.js', { ignore: '**/node_modules/**' })
  .filter(f => changedFiles.has(f))
  .filter(
    package => 
      !package.includes('README.md') &&
      !package.includes('strapi-middleware-views') &&
      !package.includes('strapi-lint') &&
      !package.includes('strapi-plugin-settings-manager') &&
      !package.includes('scripts') &&
      !package.includes('test') 
  )
  .map(file => {
    const directoryArray = file.split('/');
    const toTake = directoryArray.length === 2 ? 1 : 2;

    return take(directoryArray, toTake).join('/');
  });


files
  .filter((directory, index) => files.indexOf(directory) === index)
  .forEach(package => {
    watcher(`Testing ${package}`, package);
  });