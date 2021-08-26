'use strict';

const { join } = require('path');
const getDestinationPrompts = require('./utils/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');

module.exports = (plop, rootDir) => {
  // Controller generator
  plop.setGenerator('controller', {
    description: 'Generate a controller for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Controller name',
      },
      ...getDestinationPrompts('controller'),
    ],
    actions: answers => {
      const filePath = getFilePath(answers.destination);

      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/controllers/{{id}}.js`),
          templateFile: 'templates/controller.js.hbs',
        },
      ];
    },
  });
};
