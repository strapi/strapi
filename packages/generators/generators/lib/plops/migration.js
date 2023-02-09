'use strict';

const tsUtils = require('@strapi/typescript-utils');
const validateFileNameInput = require('./utils/validate-file-name-input');
const getFormattedDate = require('./utils/get-formatted-date');

module.exports = (plop) => {
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
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';
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
