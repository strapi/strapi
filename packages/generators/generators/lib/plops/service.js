'use strict';

const getDestinationPrompts = require('./utils/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');

module.exports = plop => {
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
      return [
        {
          type: 'add',
          path: `${filePath}/services/{{ id }}.js`,
          templateFile: 'templates/service.js.hbs',
        },
      ];
    },
  });
};
