import { join } from 'path';
import type { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';

import getDestinationPrompts from './prompts/get-destination-prompts';
import getFilePath from './utils/get-file-path';

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
      ...getDestinationPrompts('service', process.cwd()),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const currentDir = process.cwd();
      const filePath = join(currentDir, getFilePath(answers?.destination));
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      return [
        {
          type: 'add',
          path: `${filePath}/services/{{ id }}.${language}`,
          templateFile: `templates/${language}/service.${language}.hbs`,
        },
      ];
    },
  });
};
