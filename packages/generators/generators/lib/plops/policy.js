'use strict';

const getDestinationPrompts = require('./prompts/get-destination-prompts');
const getFilePath = require('./utils/get-file-path');

module.exports = plop => {
  // Policy generator
  plop.setGenerator('policy', {
    description: 'Generate a policy for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Policy name',
      },
      ...getDestinationPrompts('policy', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      const filePath = getFilePath(answers.destination);

      return [
        {
          type: 'add',
          path: `${filePath}/policies/{{id}}.js`,
          templateFile: 'templates/policy.js.hbs',
        },
      ];
    },
  });
};
