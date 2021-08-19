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

  // Model generator
  plop.setGenerator('model', {
    description: 'application model logic',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Model name',
      },
      {
        type: 'confirm',
        name: 'useDraftAndPublish',
        message: 'Use draft and publish?',
      },
    ],
    actions: [
      {
        type: 'add',
        path: join(process.cwd(), 'api/{{id}}/models/{{id}}.js'),
        templateFile: 'templates/model.js.hbs',
      },
      {
        type: 'add',
        path: join(process.cwd(), 'api/{{id}}/models/{{id}}.settings.json'),
        templateFile: 'templates/model.settings.json.hbs',
      },
    ],
  });
};
