'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const validateInput = require('./utils/validate-input');

module.exports = plop => {
  // API generator
  plop.setGenerator('api', {
    description: 'Generate a basic API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'API name',
        validate: input => validateInput(input),
      },
      {
        type: 'confirm',
        name: 'isPluginApi',
        message: 'Is this API for a plugin?',
      },
      {
        when: answers => answers.isPluginApi,
        type: 'list',
        name: 'plugin',
        message: 'Plugin name',
        choices: async () => {
          const pluginsPath = join(plop.getDestBasePath(), 'plugins');
          const exists = await fs.pathExists(pluginsPath);

          if (!exists) {
            throw Error('Couldn\'t find a "plugins" directory');
          }

          const pluginsDir = await fs.readdir(pluginsPath, { withFileTypes: true });
          const pluginsDirContent = pluginsDir.filter(fd => fd.isDirectory());

          if (pluginsDirContent.length === 0) {
            throw Error('The "plugins" directory is empty');
          }

          return pluginsDirContent;
        },
      },
      {
        type: 'list',
        name: 'kind',
        message: 'Please choose the model type',
        default: 'collectionType',
        choices: [
          { name: 'Collection Type', value: 'collectionType' },
          { name: 'Singe Type', value: 'singleType' },
        ],
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
          path: `${filePath}/controllers/{{id}}.js`,
          templateFile: 'templates/controller.js.hbs',
        },
        {
          type: 'add',
          path: `${filePath}/models/{{id}}.js`,
          templateFile: 'templates/model.js.hbs',
        },
        {
          type: 'add',
          path: `${filePath}/models/{{id}}.settings.json`,
          templateFile: 'templates/model.settings.json.hbs',
        },
        {
          type: 'add',
          path: `${filePath}/services/{{id}}.js`,
          templateFile: 'templates/service.js.hbs',
        },
      ];

      if (answers.isPluginApi) {
        return baseActions;
      } else {
        const routeType =
          answers.kind === 'singleType'
            ? 'single-type-routes.json.hbs'
            : 'collection-type-routes.json.hbs';

        return [
          {
            type: 'add',
            path: `${filePath}/config/routes.json`,
            templateFile: `templates/${routeType}`,
          },
          ...baseActions,
        ];
      }
    },
  });
};
