'use strict';

const { join } = require('path');
const fs = require('fs-extra');

module.exports = (plop, rootDir) => {
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
};
