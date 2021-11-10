'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const validateInput = require('./utils/validate-input');
const getCtNamesPrompts = require('./prompts/get-ct-names-prompts');
const getKindPrompts = require('./prompts/get-kind-prompts');
const getDraftAndPublishPrompts = require('./prompts/get-draft-and-publish-prompts');
const getAttributesPrompts = require('./prompts/get-attributes-prompts');
const getDefaultRoutesPrompts = require('./prompts/get-default-routes-prompts');

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
          type: 'confirm',
          name: 'createContentType',
          default: true,
          message: 'Create a content-type?',
        },
      ]);

      if (!api.createContentType) {
        return api;
      }

      return {
        ...api,
        ...(await inquirer.prompt([
          ...getCtNamesPrompts,
          ...getKindPrompts,
          ...getDraftAndPublishPrompts,
          ...getDefaultRoutesPrompts,
        ])),
        attributes: await getAttributesPrompts(inquirer),
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
          path: `${filePath}/services/{{id}}.js`,
          templateFile: 'templates/service.js.hbs',
        },
      ];

      if (answers.isPluginApi) {
        return baseActions;
      }

      if (!answers.createContentType) {
        return [
          {
            type: 'add',
            path: `${filePath}/routes/{{id}}.js`,
            templateFile: `templates/single-route.js.hbs`,
          },
          ...baseActions,
        ];
      }

      if (answers.generateDefaultRoutes) {
        const routeType =
          answers.kind === 'singleType'
            ? 'single-type-routes.js.hbs'
            : 'collection-type-routes.js.hbs';

        baseActions.push({
          type: 'add',
          path: `${filePath}/routes/{{id}}.js`,
          templateFile: `templates/${routeType}`,
        });
      }

      const destination =
        answers.isPluginApi && answers.plugin
          ? { destination: 'plugin', plugin: answers.id }
          : { destination: 'new' };

      return [
        ...baseActions,
        ...plop.getGenerator('content-type').actions({
          ...answers,
          ...destination,
        }),
      ];
    },
  });
};
