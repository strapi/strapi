'use strict';

const moment = require('moment');
const tsUtils = require('@strapi/typescript-utils');


const validateInput = (input) => {
  const regex = /^[A-Za-z-_0-9]+$/g;

  if (!input) {
    return 'You must provide an input';
  }

  return regex.test(input) || "Please use only letters and number, '-' or '_' and no spaces";
};

module.exports = (plop) => {
  // Migration generator
  plop.setGenerator('migration', {
    description: 'Generate a migration',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Migration name',
        validate: (input) => validateInput(input),
      },
    ],
    actions(answers) {
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';
      const timestamp = moment().format('YYYY_MM_DD_HH_mm_ss');

      return [
        {
          type: 'add',
          path: `${currentDir}/database/migrations/${timestamp}_{{ id }}.${language}`,
          templateFile: `templates/${language}/migration.${language}.hbs`,
        },
      ];
    },
  });
};
