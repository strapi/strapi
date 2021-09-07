'use strict';

module.exports = plop => {
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
    actions: () => {
      return [
        {
          type: 'addMany',
          destination: 'plugins/{{id}}/admin',
          base: 'files/plugin/admin',
          templateFiles: 'files/plugin/admin/**',
        },
        {
          type: 'add',
          path: 'plugins/{{id}}/services/{{id}}.js',
          templateFile: 'templates/service.js.hbs',
        },
        {
          type: 'add',
          path: 'plugins/{{id}}/controllers/{{id}}.js',
          templateFile: 'templates/controller.js.hbs',
        },
        {
          type: 'add',
          path: 'plugins/{{id}}/config/routes.json',
          templateFile: 'templates/plugin-routes.json.hbs',
        },
        {
          type: 'add',
          path: 'plugins/{{id}}/README.md',
          templateFile: 'templates/README.md.hbs',
        },
        {
          type: 'add',
          path: 'plugins/{{id}}/package.json',
          templateFile: 'templates/plugin-package.json.hbs',
        },
      ];
    },
  });
};
