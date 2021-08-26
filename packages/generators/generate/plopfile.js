'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const pluralize = require('pluralize');

const rootDir = process.cwd();

const getFilePath = destination => {
  if (destination === 'api') {
    return `api/{{api}}`;
  }

  if (destination === 'plugin') {
    return `plugins/{{plugin}}`;
  }

  return `api/{{id}}`;
};

const getDestinationPrompts = action => {
  return [
    {
      type: 'list',
      name: 'destination',
      message: `Where do you want to add this ${action}?`,
      choices: [
        {
          name: `Add ${action} to ${action === 'policy' ? 'root of project' : 'new API'}`,
          value: 'new',
        },
        { name: `Add ${action} to existing API`, value: 'api' },
        { name: `Add ${action} to existing plugin`, value: 'plugin' },
      ],
    },
    {
      when: answers => answers.destination === 'api',
      type: 'input',
      message: 'Which API is this for?',
      name: 'api',
      validate: async input => {
        const exists = await fs.pathExists(join(rootDir, `api/${input}`));

        return exists || 'That api does not exist, please try again';
      },
    },
    {
      when: answers => answers.destination === 'plugin',
      type: 'input',
      message: 'Which plugin is this for?',
      name: 'plugin',
      validate: async input => {
        const exists = await fs.pathExists(join(rootDir, `plugins/${input}`));

        return exists || 'That plugin does not exist, please try again';
      },
    },
  ];
};

module.exports = function(plop) {
  plop.setWelcomeMessage('Strapi Generators');

  plop.addHelper('pluralize', text => pluralize(text));

  // API generator
  plop.setGenerator('api', {
    description: 'Generate a basic API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'API name',
      },
      {
        type: 'list',
        name: 'kind',
        message: 'Please choose the model type',
        choices: [
          { name: 'Collection Type', value: 'collectionType' },
          { name: 'Singe Type', value: 'singleType' },
        ],
      },
      {
        type: 'confirm',
        name: 'isPluginApi',
        message: 'Is this API for a plugin?',
      },
      {
        when: answers => answers.isPluginApi,
        type: 'input',
        name: 'plugin',
        message: 'Plugin name',
        validate: async input => {
          const exists = await fs.pathExists(join(rootDir, `plugins/${input}`));

          return exists || 'That plugin does not exist, please try again';
        },
      },
      {
        type: 'confirm',
        name: 'useDraftAndPublish',
        message: 'Use draft and publish?',
      },
    ],
    actions: answers => {
      let filePath;
      if (answers.isPluginApi && answers.plugin) {
        filePath = `plugins/{{plugin}}`;
      } else {
        filePath = `api/{{id}}`;
      }

      const baseActions = [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/controllers/{{id}}.js`),
          templateFile: 'templates/controller.js.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, `${filePath}/models/{{id}}.js`),
          templateFile: 'templates/model.js.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, `${filePath}/models/{{id}}.settings.json`),
          templateFile: 'templates/model.settings.json.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, `${filePath}/services/{{id}}.js`),
          templateFile: 'templates/service.js.hbs',
        },
      ];

      if (answers.isPluginApi) {
        return baseActions;
      } else {
        return [
          {
            type: 'add',
            path: join(rootDir, `${filePath}/config/routes.json`),
            templateFile: 'templates/api-routes.json.hbs',
          },
          ...baseActions,
        ];
      }
    },
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
      ...getDestinationPrompts('controller'),
    ],
    actions: answers => {
      const filePath = getFilePath(answers.destination);

      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/controllers/{{id}}.js`),
          templateFile: 'templates/controller.js.hbs',
        },
      ];
    },
  });

  plop.setPrompt('recursive', require('inquirer-recursive'));
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
        type: 'list',
        name: 'kind',
        message: 'Please choose the model type',
        choices: [
          { name: 'Collection Type', value: 'collectionType' },
          { name: 'Singe Type', value: 'singleType' },
        ],
      },
      ...getDestinationPrompts('model'),
      {
        type: 'addAttributes',
        name: 'attributes',
      },
      {
        type: 'confirm',
        name: 'useDraftAndPublish',
        message: 'Use draft and publish?',
      },
    ],
    actions: answers => {
      const filePath = getFilePath(answers.destination);

      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/models/{{id}}.js`),
          templateFile: 'templates/model.js.hbs',
        },
        {
          type: 'add',
          path: join(rootDir, `${filePath}/models/{{id}}.settings.json`),
          templateFile: 'templates/model.settings.json.hbs',
        },
      ];
    },
  });

  const { prompts } = plop.inquirer.prompt;
  console.log(prompts);

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
      fs.copySync(join(__dirname, 'files', 'plugin'), join(rootDir, 'plugins', answers.id));
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

  // Policy generator
  plop.setGenerator('policy', {
    description: 'Generate a policy for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Policy name',
      },
      ...getDestinationPrompts('policy'),
    ],
    actions: answers => {
      let filePath;
      if (answers.destination === 'api') {
        filePath = `api/{{api}}`;
      } else if (answers.destination === 'plugin') {
        filePath = `plugins/{{plugin}}`;
      } else {
        filePath = ``;
      }

      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/config/policies/{{id}}.js`),
          templateFile: 'templates/policy.js.hbs',
        },
      ];
    },
  });

  // Service generator
  plop.setGenerator('service', {
    description: 'Generate a service for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Service name',
      },
      ...getDestinationPrompts('service'),
    ],
    actions: answers => {
      const filePath = getFilePath(answers.destination);
      return [
        {
          type: 'add',
          path: join(rootDir, `${filePath}/services/{{id}}.js`),
          templateFile: 'templates/service.js.hbs',
        },
      ];
    },
  });
};
