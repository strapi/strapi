'use strict';

const chalk = require('chalk');
const tsUtils = require('@strapi/typescript-utils');

const logInstructions = (pluginName, { language }) => {
  const maxLength = `    resolve: './src/plugins/${pluginName}'`.length;
  const separator = Array(maxLength).fill('─').join('');

  const exportInstruction = language === 'js' ? 'module.exports =' : 'export default';

  return `
You can now enable your plugin by adding the following in ${chalk.yellow(
    `./config/plugins.${language}`
  )}
${separator}
${exportInstruction} {
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

module.exports = (plop) => {
  const currentDir = process.cwd();
  const typescriptPrompt = tsUtils.isUsingTypeScriptSync(currentDir) ? [] : [{
    type: 'list',
    name: 'isTypescript',
    message: 'Choose your preferred language',
    choices: ['Javascript', 'Typescript'],
    default: 'Javascript',
  }];
  // Plugin generator
  plop.setGenerator('plugin', {
    description: 'Generate a basic plugin',
    prompts: [
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin name',
      },
      ...typescriptPrompt
    ],
    actions(answers) {
      const isTypescript = answers?.isTypescript === 'Typescript';
      const language = tsUtils.isUsingTypeScriptSync(currentDir) || isTypescript ? 'ts' : 'js';

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
