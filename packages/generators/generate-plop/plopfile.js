'use strict';

const { join } = require('path');

module.exports = function(plop) {
  // Service generator
  plop.setGenerator('service', {
    description: 'Generate a service for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Service name',
      },
    ],
    actions: [
      {
        type: 'add',
        path: join(process.cwd(), 'api/{{id}}/services/{{id}}.js'),
        templateFile: 'templates/service.js.hbs',
      },
    ],
  });
};
