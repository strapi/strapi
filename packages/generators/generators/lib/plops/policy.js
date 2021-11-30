'use strict';

const getDestinationPrompts = require('./prompts/get-destination-prompts');

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
      let filePath;
      if (answers.destination === 'api') {
        filePath = `api/{{api}}`;
      } else if (answers.destination === 'plugin') {
        filePath = `plugins/{{plugin}}`;
      } else {
        filePath = `./`;
      }

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
