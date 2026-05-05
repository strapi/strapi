import type { ActionType, NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';
import { join } from 'path';
import fs from 'fs';

import getDestinationPrompts from './prompts/get-destination-prompts';
import validateInput from './utils/validate-input';
import getFilePath from './utils/get-file-path';
import { appendToFile } from './utils/extend-plugin-index-files';

export default (plop: NodePlopAPI) => {
  // Policy generator
  plop.setGenerator('policy', {
    description: 'Generate a policy for an API',
    prompts: [
      {
        type: 'input',
        name: 'id',
        message: 'Policy name',
        validate: (input) => validateInput(input),
      },
      ...getDestinationPrompts('policy', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const currentDir = process.cwd();
      const filePath = getFilePath(answers.destination);
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
          path: `${filePath}/policies/{{ id }}.${language}`,
          templateFile: `templates/${language}/policy.${language}.hbs`,
        },
      ];

      if (answers.plugin) {
        const indexPath = join(plop.getDestBasePath(), `${filePath}/policies/index.${language}`);
        const exists = fs.existsSync(indexPath);

        if (!exists) {
          // Create index file if it doesn't exist
          baseActions.push({
            type: 'add',
            path: `${filePath}/policies/index.${language}`,
            templateFile: `templates/${language}/plugin/plugin.index.${language}.hbs`,
            skipIfExists: true,
          });
        }

        // Append the new policy to the index.ts file
        baseActions.push({
          type: 'modify',
          path: `${filePath}/policies/index.${language}`,
          transform(template: string) {
            return appendToFile(template, { type: 'index', singularName: answers.id });
          },
        });
      }

      return baseActions;
    },
  });
};
