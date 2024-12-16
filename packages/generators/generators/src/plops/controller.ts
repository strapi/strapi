import { join } from 'path';
import type { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';

import getDestinationPrompts from './prompts/get-destination-prompts';
import getFilePath from './utils/get-file-path';
import validateInput from './utils/validate-input';

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
      ...getDestinationPrompts('controller', process.cwd()),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const currentDir = process.cwd();
      const filePath = join(currentDir, getFilePath(answers.destination));
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      return [
        {
          type: 'add',
          path: `${filePath}/controllers/{{ id }}.${language}`,
          templateFile: `templates/${language}/controller.${language}.hbs`,
        },
      ];
    },
  });
};
