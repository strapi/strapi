'use strict';

const tsUtils = require('@strapi/typescript-utils');
const crypto = require('crypto');

const validateInput = require('./utils/validate-input');

const generateASecret = () => crypto.randomBytes(16).toString('base64');

module.exports = (plop) => {
  // environment generator
  plop.setGenerator('environment', {
    description: 'Generate an environment configuration',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Environment name',
        validate: (input) => validateInput(input),
      },
    ],
    actions() {
      const filePath = 'config/env';
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      const baseActions = [
        {
          type: 'add',
          path: `${filePath}/{{ id }}/api.${language}`,
          templateFile: `templates/${language}/api.${language}.hbs`,
        },
        {
          type: 'add',
          path: `${filePath}/{{ id }}/server.${language}`,
          templateFile: `templates/${language}/server.${language}.hbs`,
        },
        {
          type: 'add',
          path: `${filePath}/{{ id }}/database.${language}`,
          templateFile: `templates/${language}/database.${language}.hbs`,
        },
        {
          type: 'add',
          path: `${filePath}/{{ id }}/middlewares.${language}`,
          templateFile: `templates/${language}/middlewares.${language}.hbs`,
        },
        {
          type: 'add',
          path: `${filePath}/{{ id }}/admin.${language}`,
          templateFile: `templates/${language}/admin.${language}.hbs`,
          data: { generateASecret },
        },
      ];

      return baseActions;
    },
  });
};
