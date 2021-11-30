'use strict';

const getDestinationPrompts = require('./prompts/get-destination-prompts');

module.exports = plop => {
  // middleware generator
  plop.setGenerator('middleware', {
    description: 'Generate a middleware for an API',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Middleware name',
      },
      ...getDestinationPrompts('middleware', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      let filePath;
      if (answers.destination === 'api') {
        filePath = `api/{{ api }}`;
      } else if (answers.destination === 'plugin') {
        filePath = `plugins/{{ plugin }}`;
      } else {
        filePath = `./`;
      }

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
