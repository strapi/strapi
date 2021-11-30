'use strict';

const getDestinationPrompts = require('./prompts/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');
const validateInput = require('./utils/validate-input');

module.exports = plop => {
  // Controller generator
  plop.setGenerator('controller', {
    description: 'Generate a controller for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Controller name',
        validate: input => validateInput(input),
      },
      ...getDestinationPrompts('controller', plop.getDestBasePath()),
    ],
    actions(answers) {
      const filePath = getFilePath(answers.destination);

      return [
        {
          type: 'add',
          path: `${filePath}/controllers/{{ id }}.js`,
          templateFile: 'templates/controller.js.hbs',
        },
      ];
    },
  });
};
