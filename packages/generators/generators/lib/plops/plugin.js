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
    actions() {
      return [
        {
          type: 'addMany',
          destination: 'plugins/{{id}}',
          base: 'files/plugin',
          templateFiles: 'files/plugin/**',
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
