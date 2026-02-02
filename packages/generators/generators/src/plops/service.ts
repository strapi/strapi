import type { ActionType, NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';
import { join } from 'path';
import fs from 'fs';

import getDestinationPrompts from './prompts/get-destination-prompts';
import getFilePath from './utils/get-file-path';
import { appendToFile } from './utils/extend-plugin-index-files';

export default (plop: NodePlopAPI) => {
  // Service generator
  plop.setGenerator('service', {
    description: 'Generate a service for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Service name',
      },
      ...getDestinationPrompts('service', plop.getDestBasePath()),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const filePath = getFilePath(answers?.destination);
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
          path: `${filePath}/services/{{ id }}.${language}`,
          templateFile: `templates/${language}/service.${language}.hbs`,
        },
      ];

      if (answers.plugin) {
        const indexPath = join(plop.getDestBasePath(), `${filePath}/services/index.${language}`);
        const exists = fs.existsSync(indexPath);

        if (!exists) {
          // Create index file if it doesn't exist
          baseActions.push({
            type: 'add',
            path: `${filePath}/services/index.${language}`,
            templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
            skipIfExists: true,
          });
        }

        // Append the new service to the index.ts file
        baseActions.push({
          type: 'modify',
          path: `${filePath}/services/index.${language}`,
          transform(template: string) {
            return appendToFile(template, { type: 'index', singularName: answers.id });
          },
        });
      }

      return baseActions;
    },
  });
};
