'use strict';

const getDestinationPrompts = require('./prompts/get-destination-prompts');
const validateInput = require('./utils/validate-input');
const getFilePath = require('./utils/get-file-path');

module.exports = plop => {
  // middleware generator
  plop.setGenerator('middleware', {
    description: 'Generate a middleware for an API',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Middleware name',
        validate: input => validateInput(input),
      },
      ...getDestinationPrompts('middleware', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      const filePath = getFilePath(answers.destination);
      return [
        {
          type: 'add',
          path: `${filePath}/middlewares/{{ name }}.js`,
          templateFile: 'templates/middleware.js.hbs',
        },
      ];
    },
  });
};
