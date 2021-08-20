'use strict';

const { join } = require('path');
const fs = require('fs-extra');

module.exports = function(plop) {
  const rootDir = process.cwd();
  plop.setWelcomeMessage('Strapi Generators');

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
        path: join(rootDir, 'api/{{id}}/services/{{id}}.js'),
        templateFile: 'templates/service.js.hbs',
      },
    ],
  });

  // Model generator
  plop.setGenerator('model', {
    description: 'Generate a model for an API',
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
        path: join(rootDir, 'api/{{id}}/models/{{id}}.js'),
        templateFile: 'templates/model.js.hbs',
      },
      {
        type: 'add',
        path: join(rootDir, 'api/{{id}}/models/{{id}}.settings.json'),
        templateFile: 'templates/model.settings.json.hbs',
      },
    ],
  });

  // Controller generator
  plop.setGenerator('controller', {
    description: 'Generate a controller for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Controller name',
      },
    ],
    actions: [
      {
        type: 'add',
        path: join(rootDir, 'api/{{id}}/controllers/{{id}}.js'),
        templateFile: 'templates/controller.js.hbs',
      },
    ],
  });

  // Policy generator
  plop.setGenerator('policy', {
    description: 'Generate a policy for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Policy name',
      },
    ],
    actions: [
      {
        type: 'add',
        path: join(rootDir, 'config/policies/{{id}}.js'),
        templateFile: 'templates/policy.js.hbs',
      },
    ],
  });

  // Plugin generator
  plop.setGenerator('plugin', {
    description: 'Generate a basic plugin',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Plugin name',
      },
    ],
    actions: data => {
      fs.copySync(join(__dirname, 'files', 'plugin'), join(rootDir, 'plugins', data.id));

      return [
        {
          type: 'add',
          path: join(rootDir, 'plugins/{{id}}/services/{{id}}.js'),
          templateFile: 'templates/service.js.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, 'plugins/{{id}}/controllers/{{id}}.js'),
          templateFile: 'templates/controller.js.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, 'plugins/{{id}}/config/routes.json'),
          templateFile: 'templates/routes.json.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, 'plugins/{{id}}/README.md'),
          templateFile: 'templates/README.md.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, 'plugins/{{id}}/package.json'),
          templateFile: 'templates/plugin-package.json.hbs',
        },
      ];
    },
  });
};
