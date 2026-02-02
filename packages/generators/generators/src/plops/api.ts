import { join } from 'path';
import type { ActionType, NodePlopAPI } from 'plop';
import fs from 'fs-extra';
import tsUtils from '@strapi/typescript-utils';

import validateInput from './utils/validate-input';
import getFilePath from './utils/get-file-path';
import { appendToFile } from './utils/extend-plugin-index-files';

export default (plop: NodePlopAPI) => {
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
      if (!answers) {
        return [];
      }

      const filePath = getFilePath(
        answers.destination || (answers.isPluginApi && answers.plugin ? 'plugin' : 'api')
      );
      const currentDir = process.cwd();
      let language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      if (answers.plugin) {
        // The tsconfig in plugins is located just outside the server src, not in the root of the plugin.
        const pluginServerDir = join(
          currentDir,
          'src',
          filePath.replace('{{ plugin }}', answers.plugin),
          '../'
        );
        language = tsUtils.isUsingTypeScriptSync(pluginServerDir) ? 'ts' : 'js';
      }

      const baseActions: Array<ActionType> = [
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
        {
          type: 'add',
          path: `${filePath}/routes/${answers.plugin ? 'content-api/' : ''}{{ id }}.${language}`,
          templateFile: `templates/${language}/single-route.${language}.hbs`,
        },
      ];

      if (answers.isPluginApi) {
        const indexFiles = ['controllers', 'services', 'routes'];

        indexFiles.forEach((type) => {
          const indexPath = join(plop.getDestBasePath(), `${filePath}/${type}/index.${language}`);
          const exists = fs.existsSync(indexPath);

          if (!exists && type !== 'routes') {
            baseActions.push({
              type: 'add',
              path: `${filePath}/${type}/index.${language}`,
              templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
              skipIfExists: true,
            });
          }

          if (type === 'routes') {
            const indexPath = join(plop.getDestBasePath(), `${filePath}/${type}/index.${language}`);
            const exists = fs.existsSync(indexPath);

            if (!exists) {
              baseActions.push({
                type: 'add',
                path: `${filePath}/${type}/index.${language}`,
                templateFile: `templates/${language}/plugin/plugin.routes.index.${language}.hbs`,
                skipIfExists: true,
              });
            }

            const routeIndexFiles = ['content-api', 'admin'];

            routeIndexFiles.forEach((routeType) => {
              const routeTypeIndexPath = join(
                plop.getDestBasePath(),
                `${filePath}/${type}/${routeType}/index.${language}`
              );
              const routeTypeExists = fs.existsSync(routeTypeIndexPath);

              if (!routeTypeExists) {
                baseActions.push({
                  type: 'add',
                  path: `${filePath}/${type}/${routeType}/index.${language}`,
                  templateFile: `templates/${language}/plugin/plugin.routes.type.index.${language}.hbs`,
                  data: { type: routeType },
                  skipIfExists: true,
                });
              }
            });
          }

          baseActions.push({
            type: 'modify',
            path: `${filePath}/${type}/${type === 'routes' ? 'content-api/' : ''}index.${language}`,
            transform(template: string) {
              if (type === 'routes') {
                return appendToFile(template, { type: 'routes', singularName: answers.id });
              }

              return appendToFile(template, { type: 'index', singularName: answers.id });
            },
          });
        });
      }

      return baseActions;
    },
  });
};
