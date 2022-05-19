'use strict';

const chalk = require('chalk');
const { isKebabCase, toKebabCase } = require('@strapi/utils');
const validateInput = require('./utils/validate-input');

const logInstructions = pluginName => {
  const maxLength = `    resolve: './src/plugins/${pluginName}'`.length;
  const separator = Array(maxLength)
    .fill('─')
    .join('');

  return `
You can now enable your plugin by adding the following in ${chalk.yellow('./config/plugins.js')}.
${separator}
module.exports = {
  ${chalk.gray('// ...')}
  ${chalk.green(`'${pluginName}'`)}: {
    enabled: ${chalk.yellow(true)},
    resolve: ${chalk.yellow(`'./src/plugins/${pluginName}'`)}
  },
  ${chalk.gray('// ...')}
}
${separator}
`;
};

module.exports = plop => {
  // Plugin generator
  plop.setGenerator('plugin', {
    description: 'Generate a basic plugin',
    prompts: [
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin name',
        validate: input => validateInput(input),
      },
    ],
    actions(answers) {
      if (!isKebabCase(answers.pluginName)) {
        answers.pluginName = toKebabCase(answers.pluginName);
        console.log(
          chalk.yellow(
            `Strapi only supports kebab-cased names for plugins.\nYour plugin has been automatically renamed to "${answers.pluginName}".`
          )
        );
      }

      return [
        {
          type: 'addMany',
          destination: 'plugins/{{ pluginName }}',
          base: 'files/plugin',
          templateFiles: 'files/plugin/**',
        },
        {
          type: 'add',
          path: 'plugins/{{ pluginName }}/README.md',
          templateFile: 'templates/README.md.hbs',
        },
        {
          type: 'add',
          path: 'plugins/{{ pluginName }}/package.json',
          templateFile: 'templates/plugin-package.json.hbs',
        },
        () => plop.renderString(logInstructions(answers.pluginName)),
      ];
    },
  });
};
