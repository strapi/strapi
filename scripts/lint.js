const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const eslintErrorsFormatter = require('./eslintErrorsFormatter');
const listChangedFiles = require('../packages/strapi-lint/lib/internals/shared/listChangedFiles.js');
const changedFiles = listChangedFiles();
const { take, template } = require('lodash');

const cmdEslint = template(
  'node ../../node_modules/strapi-lint/node_modules/.bin/eslint --ignore-path .gitignore --ignore-pattern "${ignore}"' +
    ' --config ../../node_modules/strapi-lint/lib/internals/eslint/${conf}/.eslintrc.json ${params}',
);

const cmdFront = cmdEslint({ ignore: '/admin/build/', conf: 'front', params: 'admin' });
const cmdHelper = cmdEslint({ ignore: '/admin/build/', conf: 'front', params: 'lib/src' });
const cmdBack = cmdEslint({ ignore: '/admin', conf: 'back', params: 'controllers config services bin lib' });

const watcher = (label, pckgName) => {
  shell.echo(label);
  shell.cd(pckgName);
  const cmd = pckgName.includes('strapi-helper-plugin') ? cmdHelper : `${cmdFront} && ${cmdBack}`;

  const data = shell.exec(cmd, { silent: true });
  shell.echo(chalk(eslintErrorsFormatter(data.stdout)));
  shell.cd('../..');

  if (data.code !== 0) {
    process.exit(1);
  }
  shell.echo('');
};

const except = [
  'docs',
  'jest.config.js',
  'jest.config.front.js',
  'fileTransformer.js',
  'jest.config.e2e.js',
  'scripts',
  'strapi-lint',
  'strapi-middleware-views',
  'strapi-plugin-settings-manager',
  'test',
  'cypress',
];

const changedDirs = [...changedFiles]
  .filter(file => path.extname(file) === '.js' && !except.some(path => file.includes(path)))
  .map(file => {
    const directoryArray = file.split('/');
    const toTake = directoryArray.length === 2 ? 1 : 2;

    return take(directoryArray, toTake).join('/');
  });

[...new Set(changedDirs)].forEach(directory => {
  watcher(`Testing ${directory}`, directory);
});
