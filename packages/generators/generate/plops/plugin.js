'use strict';

const { join } = require('path');
const fs = require('fs-extra');

module.exports = (plop, rootDir) => {
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
    actions: answers => {
      fs.copySync(join(__dirname, '..', 'files', 'plugin'), join(rootDir, 'plugins', answers.id));
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
          templateFile: 'templates/plugin-routes.json.hbs',
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
