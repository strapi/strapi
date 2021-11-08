'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const validateInput = require('./utils/validate-input');

module.exports = plop => {
  // API generator
  plop.setGenerator('api', {
    description: 'Generate a basic API',
    async prompts(inquirer) {
      const api = await inquirer.prompt([
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
          async choices() {
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
            { name: 'Single Type', value: 'singleType' },
          ],
        },
        {
          type: 'confirm',
          name: 'useDraftAndPublish',
          default: false,
          message: 'Use draft and publish?',
        },
        {
          type: 'confirm',
          name: 'createContentType',
          default: false,
          message: 'Create a content-type?',
        },
      ]);

      if (!api.createContentType) {
        return api;
      }

      return {
        ...api,
        // TODO: make prompts and actions more re-usable and composable
        ...(await plop.getGenerator('content-type').prompts(inquirer)),
      };
    },
    actions(answers) {
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
          path: `${filePath}/content-types/{{id}}/schema.json`,
          templateFile: 'templates/content-type.schema.json.hbs',
        },
        {
          type: 'add',
          path: `${filePath}/services/{{id}}.js`,
          templateFile: 'templates/service.js.hbs',
        },
      ];

      if (answers.isPluginApi) {
        return baseActions;
      }

      const routeType =
        answers.kind === 'singleType'
          ? 'single-type-routes.js.hbs'
          : 'collection-type-routes.js.hbs';

      return [
        {
          type: 'add',
          path: `${filePath}/routes/{{id}}.js`,
          templateFile: `templates/${routeType}`,
        },
        ...baseActions,
        // TODO: make prompts and actions more re-usable and composable
        ...(answers.createContentType ? plop.getGenerator('content-type').actions(answers) : []),
      ];
    },
  });
};
