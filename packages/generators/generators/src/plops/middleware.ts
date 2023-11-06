import { NodePlopAPI } from 'plop';
import tsUtils from '@strapi/typescript-utils';

import getDestinationPrompts from './prompts/get-destination-prompts';
import validateInput from './utils/validate-input';
import getFilePath from './utils/get-file-path';

export default (plop: NodePlopAPI) => {
  // middleware generator
  plop.setGenerator('middleware', {
    description: 'Generate a middleware for an API',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Middleware name',
        validate: (input) => validateInput(input),
      },
      ...getDestinationPrompts('middleware', plop.getDestBasePath(), { rootFolder: true }),
    ],
    actions(answers) {
      if (!answers) {
        return [];
      }

      const filePath = getFilePath(answers.destination);
      const currentDir = process.cwd();
      const language = tsUtils.isUsingTypeScriptSync(currentDir) ? 'ts' : 'js';

      return [
        {
          type: 'add',
          path: `${filePath}/middlewares/{{ name }}.${language}`,
          templateFile: `templates/${language}/middleware.${language}.hbs`,
        },
      ];
    },
  });
};
