'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const tsUtils = require('@strapi/typescript-utils');

const validateInput = require('./utils/validate-input');

module.exports = (plop) => {
  // API generator
  plop.setGenerator('api', {
    description: 'Generate a basic API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'API name',
        validate: (input) => validateInput(input),
      },
      {
        type: 'confirm',
        name: 'isPluginApi',
        message: 'Is this API for a plugin?',
      },
      {
        when: (answers) => answers.isPluginApi,
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
          const pluginsDirContent = pluginsDir.filter((fd) => fd.isDirectory());

          if (pluginsDirContent.length === 0) {
            throw Error('The "plugins" directory is empty');
          }

          return pluginsDirContent;
        },
      },
    ],
    actions(answers) {
      const filePath = answers.isPluginApi && answers.plugin ? 'plugins/{{ plugin }}' : 'api/{{ id }}';
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      const baseActions = [
        {
          type: 'add',
          path: `${filePath}/controllers/{{ id }}.${language}`,
          templateFile: `templates/${language}/controller.${language}.hbs`,
        },
        {
          type: 'add',
          path: `${filePath}/services/{{ id }}.${language}`,
          templateFile: `templates/${language}/service.${language}.hbs`,
        },
      ];

      if (answers.isPluginApi) {
        return baseActions;
      }

      return [
        {
          type: 'add',
          path: `${filePath}/routes/{{ id }}.${language}`,
          templateFile: `templates/${language}/single-route.${language}.hbs`,
        },
        ...baseActions,
      ];
    },
  });
};
