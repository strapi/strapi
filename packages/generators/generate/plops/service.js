'use strict';

const { join } = require('path');
const getDestinationPrompts = require('./utils/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');

module.exports = (plop, rootDir) => {
  // Service generator
  plop.setGenerator('service', {
    description: 'Generate a service for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Service name',
      },
      ...getDestinationPrompts('service'),
    ],
    actions: answers => {
      const filePath = getFilePath(answers.destination);
      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/services/{{id}}.js`),
          templateFile: 'templates/service.js.hbs',
        },
      ];
    },
  });
};
