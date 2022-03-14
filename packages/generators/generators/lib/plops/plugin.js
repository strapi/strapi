'use strict';

const chalk = require('chalk');
const tsUtils = require('@strapi/typescript-utils');

const logInstructions = (pluginName, { language }) => {
  const maxLength = `    resolve: './src/plugins/${pluginName}'`.length;
  const separator = Array(maxLength)
    .fill('─')
    .join('');

  return `
You can now enable your plugin by adding the following in ${chalk.yellow(
    `./config/plugins.${language}`
  )}
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
      },
    ],
    actions(answers) {
      const currentDir = process.cwd();
      const language = tsUtils.isTypeScriptProjectSync(currentDir) ? 'ts' : 'js';

      // TODO: Adds tsconfig & build command for TS plugins?

      return [
        {
          type: 'addMany',
          destination: 'plugins/{{ pluginName }}',
          base: `files/${language}/plugin`,
          templateFiles: `files/${language}/plugin/**`,
        },
        {
          type: 'add',
          path: 'plugins/{{ pluginName }}/README.md',
          templateFile: `templates/${language}/README.md.hbs`,
        },
        {
          type: 'add',
          path: 'plugins/{{ pluginName }}/package.json',
          templateFile: `templates/${language}/plugin-package.json.hbs`,
        },
        () => plop.renderString(logInstructions(answers.pluginName, { language })),
      ];
    },
  });
};
