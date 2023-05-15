import { NodePlopAPI } from 'plop';
import chalk from 'chalk';
import tsUtils from '@strapi/typescript-utils';
import utils from '@strapi/utils';

import validateInput from './utils/validate-input';

const LANGUAGES = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

const logInstructions = (pluginName: string, { language }: { language: string }) => {
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

export default (plop: NodePlopAPI) => {
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
      if (!answers) {
        return [];
      }

      const isTypescript = answers.language === LANGUAGES.typescript;
      const language = isTypescript ? 'ts' : 'js';
      const projectLanguage = tsUtils.isUsingTypeScriptSync(process.cwd()) ? 'ts' : 'js';

      if (!utils.isKebabCase(answers.pluginName)) {
        answers.pluginName = utils.toKebabCase(answers.pluginName);
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
        () =>
          plop.renderString(
            logInstructions(answers.pluginName, { language: projectLanguage }),
            null
          ),
      ];
    },
  });
};
