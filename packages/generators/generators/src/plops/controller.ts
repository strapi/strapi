import type { ActionType, NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';
import { join } from 'path';
import fs from 'fs';

import getDestinationPrompts from './prompts/get-destination-prompts';
import getFilePath from './utils/get-file-path';
import validateInput from './utils/validate-input';
import { appendToFile } from './utils/extend-plugin-index-files';

export default (plop: NodePlopAPI) => {
  // Controller generator
  plop.setGenerator('controller', {
    description: 'Generate a controller for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Controller name',
        validate: (input) => validateInput(input),
      },
      ...getDestinationPrompts('controller', plop.getDestBasePath()),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const filePath = getFilePath(answers.destination);
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
      ];

      if (answers.plugin) {
        const indexPath = join(plop.getDestBasePath(), `${filePath}/controllers/index.${language}`);
        const exists = fs.existsSync(indexPath);

        if (!exists) {
          // Create index file if it doesn't exist
          baseActions.push({
            type: 'add',
            path: `${filePath}/controllers/index.${language}`,
            templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
            skipIfExists: true,
          });
        }

        // Append the new controller to the index.ts file
        baseActions.push({
          type: 'modify',
          path: `${filePath}/controllers/index.${language}`,
          transform(template: string) {
            return appendToFile(template, { type: 'index', singularName: answers.id });
          },
        });
      }

      return baseActions;
    },
  });
};
