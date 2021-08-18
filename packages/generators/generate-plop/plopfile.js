'use strict';

const { join } = require('path');

module.exports = function(plop) {
  // Service generator
  plop.setGenerator('service', {
    description: 'application service logic',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'service name please',
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
