'use strict';

const tsUtils = require('@strapi/typescript-utils');

const getDestinationPrompts = require('./prompts/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');

module.exports = (plop) => {
  // Service generator
  plop.setGenerator('service', {
    description: 'Generate a service for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Service name',
      },
      ...getDestinationPrompts('service', plop.getDestBasePath()),
    ],
    actions(answers) {
      const filePath = getFilePath(answers.destination);
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      return [
        {
          type: 'add',
          path: `${filePath}/services/{{ id }}.${language}`,
          templateFile: `templates/${language}/service.${language}.hbs`,
        },
      ];
    },
  });
};
