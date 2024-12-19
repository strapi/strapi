import type { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';
import validateFileNameInput from './utils/validate-file-name-input';
import getFormattedDate from './utils/get-formatted-date';

export default (plop: NodePlopAPI) => {
  // Migration generator
  plop.setGenerator('migration', {
    description: 'Generate a migration',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Migration name',
        validate: (input) => validateFileNameInput(input),
      },
    ],
    actions() {
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';
      const currentDir = process.cwd();
      const timestamp = getFormattedDate();

      return [
        {
          type: 'add',
          path: `${currentDir}/database/migrations/${timestamp}.{{ name }}.${language}`,
          templateFile: `templates/${language}/migration.${language}.hbs`,
        },
      ];
    },
  });
};
