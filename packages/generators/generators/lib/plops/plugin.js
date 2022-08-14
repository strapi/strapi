'use strict';

const chalk = require('chalk');
const { isUsingTypeScriptSync } = require('@strapi/typescript-utils');
const { isKebabCase, toKebabCase } = require('@strapi/utils');

const validateInput = require('./utils/validate-input');

const LANGUAGES = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

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
  // Plugin generator
  plop.setGenerator('plugin', {
    description: 'Generate a basic plugin',
    prompts: [
      {
        type: 'input',
        name: 'pluginName',
        message: 'Plugin name',
        validate: (input) => validateInput(input),
      },
      {
        type: 'list',
        name: 'language',
        message: 'Choose your preferred language',
        choices: Object.values(LANGUAGES),
        default: LANGUAGES.javascript,
      },
    ],
    actions(answers) {
      const isTypescript = answers.language === LANGUAGES.typescript;
      const language = isTypescript ? 'ts' : 'js';
      const projectLanguage = isUsingTypeScriptSync(process.cwd()) ? 'ts' : 'js';

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
        () => plop.renderString(logInstructions(answers.pluginName, { language: projectLanguage })),
      ];
    },
  });
};
